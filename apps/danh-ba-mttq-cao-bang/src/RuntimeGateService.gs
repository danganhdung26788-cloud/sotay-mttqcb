function runtimeGateDigestHex_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2)).join('');
}

function runtimeGateEnabled_() {
  return !!RUNTIME_GATE_TOKEN_SHA256 &&
    RUNTIME_GATE_TOKEN_SHA256 !== '__RUNTIME_GATE_TOKEN_SHA256__' &&
    /^[a-f0-9]{64}$/.test(String(RUNTIME_GATE_TOKEN_SHA256));
}

function requireRuntimeGateToken_(token) {
  if (!runtimeGateEnabled_()) throw new Error('RUNTIME_GATE_DISABLED');
  const actual = runtimeGateDigestHex_(token);
  if (!safeEquals_(actual, String(RUNTIME_GATE_TOKEN_SHA256))) {
    throw new Error('RUNTIME_GATE_DENIED');
  }
}

function runtimeCredentialState_() {
  const users = tableObjects_(CONFIG.SHEETS.USERS);
  const active = users.filter(u => String(u.status) === 'ACTIVE');
  const pending = active.filter(u => String(u.credential_state || '') === 'PENDING_PROVISION');
  const provisioned = active.filter(u => String(u.credential_state || '') === 'PROVISIONED');
  const emptyHashes = active.filter(u => !String(u.password_hash || '').trim());
  const emptySalts = active.filter(u => !String(u.password_salt || '').trim());
  const mustChange = active.filter(u => bool_(u.must_change_password));

  let state = 'PASS';
  if (pending.length || emptyHashes.length || emptySalts.length) state = 'ACTION_REQUIRED';

  return {
    credential_state: state,
    total_users: users.length,
    active_users: active.length,
    provisioned_count: provisioned.length,
    pending_provision_count: pending.length,
    empty_password_hashes: emptyHashes.length,
    empty_password_salts: emptySalts.length,
    must_change_password_count: mustChange.length
  };
}

function runRuntimeBaselineGate_(token) {
  requireRuntimeGateToken_(token);

  const setup = setupDatabase_();
  const verify = verifyDatabase_();
  const regression = runPhase4RegressionTests_();
  const credentials = runtimeCredentialState_();

  const ok = !!(
    setup && setup.ok &&
    verify && verify.ok &&
    regression && regression.ok
  );

  return {
    ok: ok,
    gate: ok ? (credentials.credential_state === 'PASS' ? 'PASS' : 'REVIEW') : 'BLOCKED',
    app_version: CONFIG.VERSION,
    database: {
      organizations: verify.organizations,
      communes: verify.communes,
      contacts: verify.contacts,
      users: verify.users,
      commune_admins: verify.commune_admins
    },
    regression: regression,
    credentials: credentials
  };
}

function runtimeProvisionPendingCredentials_(token) {
  requireRuntimeGateToken_(token);
  const before = runtimeCredentialState_();
  if (before.credential_state === 'PASS') {
    return {
      ok:true,
      gate:'PASS',
      provision:{ok:true,count:0,no_change:true,credential_state:'PROVISIONED'},
      credentials:before
    };
  }

  const provision = provisionPendingCredentials_();
  const after = runtimeCredentialState_();
  return {
    ok:after.credential_state === 'PASS',
    gate:after.credential_state === 'PASS' ? 'PASS' : 'BLOCKED',
    provision:provision,
    credentials:after
  };
}

function runtimeGateResponse_(e) {
  try {
    const token = String((e && e.parameter && e.parameter.token) || '');
    const mode = String((e && e.parameter && e.parameter.mode) || 'baseline').toLowerCase();
    const result = mode === 'provision'
      ? runtimeProvisionPendingCredentials_(token)
      : runRuntimeBaselineGate_(token);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const message = String(err && err.message || err);
    const safe = message === 'RUNTIME_GATE_DISABLED' || message === 'RUNTIME_GATE_DENIED'
      ? message
      : 'RUNTIME_GATE_FAILED';
    return ContentService
      .createTextOutput(JSON.stringify({ok:false,gate:'BLOCKED',error:safe}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
