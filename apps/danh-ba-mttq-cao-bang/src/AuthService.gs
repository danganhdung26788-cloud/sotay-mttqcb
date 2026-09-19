function passwordDigest_(password, salt) {
  let text = String(salt) + '|' + String(password);
  for (let i = 0; i < CONFIG.AUTH.HASH_ITERATIONS; i++) {
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      text,
      Utilities.Charset.UTF_8
    );
    text = bytes.map(b => ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2)).join('');
  }
  return text;
}


function provisionAllAdminPasswords_(initialPassword) {
  if (!initialPassword || String(initialPassword).length < CONFIG.AUTH.MIN_PASSWORD_LENGTH) {
    throw new Error('Mật khẩu khởi tạo không đạt yêu cầu.');
  }
  const users = tableObjects_(CONFIG.SHEETS.USERS);
  let count = 0;
  users.filter(u => String(u.status) === 'ACTIVE').forEach(u => {
    const salt = Utilities.getUuid().replace(/-/g, '');
    const hash = passwordDigest_(initialPassword, salt);
    updateByHeaders_(CONFIG.SHEETS.USERS, u._row, {
      password_hash: hash,
      password_salt: salt,
      credential_state: 'PROVISIONED',
      must_change_password: true,
      updated_at: nowIso_()
    });
    count++;
  });
  audit_('SYSTEM', 'PROVISION_INITIAL_ADMIN_PASSWORDS', 'USERS', 'ALL', null, {count: count}, 'PASS');
  return {ok: true, count: count};
}


function login_(username, password) {
  const uname = normalizeUsername_(username);
  const user = tableObjects_(CONFIG.SHEETS.USERS).find(
    u => normalizeUsername_(u.username) === uname
  );
  if (!user || String(user.status) !== 'ACTIVE' || String(user.credential_state) !== 'PROVISIONED') {
    audit_(uname, 'LOGIN', 'USER', user ? user.user_id : '', null, null, 'DENIED');
    throw new Error('Tài khoản hoặc mật khẩu không hợp lệ.');
  }
  const actual = passwordDigest_(password, user.password_salt);
  if (!safeEquals_(actual, String(user.password_hash))) {
    audit_(uname, 'LOGIN', 'USER', user.user_id, null, null, 'DENIED');
    throw new Error('Tài khoản hoặc mật khẩu không hợp lệ.');
  }
  const token = Utilities.getUuid();
  const session = {
    user_id: user.user_id,
    username: user.username,
    role_id: user.role_id,
    scope_org_id: user.scope_org_id,
    must_change_password: String(user.must_change_password).toUpperCase() === 'TRUE' || user.must_change_password === true
  };
  CacheService.getScriptCache().put(
    'SESSION:' + token,
    JSON.stringify(session),
    CONFIG.AUTH.SESSION_TTL_SECONDS
  );
  updateByHeaders_(CONFIG.SHEETS.USERS, user._row, {last_login: nowIso_(), updated_at: nowIso_()});
  audit_(user.username, 'LOGIN', 'USER', user.user_id, null, null, 'PASS');
  return {ok: true, token: token, user: session};
}


function requireSession_(token) {
  const raw = CacheService.getScriptCache().get('SESSION:' + token);
  if (!raw) throw new Error('Phiên đăng nhập đã hết hạn.');
  return JSON.parse(raw);
}


function logout_(token) {
  CacheService.getScriptCache().remove('SESSION:' + token);
  return {ok: true};
}


function changePassword_(token, currentPassword, newPassword) {
  const session = requireSession_(token);
  if (!newPassword || String(newPassword).length < CONFIG.AUTH.MIN_PASSWORD_LENGTH) {
    throw new Error('Mật khẩu mới phải có ít nhất ' + CONFIG.AUTH.MIN_PASSWORD_LENGTH + ' ký tự.');
  }
  const user = findBy_(CONFIG.SHEETS.USERS, 'user_id', session.user_id);
  if (!user) throw new Error('Không tìm thấy tài khoản.');
  if (!safeEquals_(passwordDigest_(currentPassword, user.password_salt), String(user.password_hash))) {
    throw new Error('Mật khẩu hiện tại không đúng.');
  }
  const salt = Utilities.getUuid().replace(/-/g, '');
  const before = {must_change_password: user.must_change_password, password_version: user.password_version};
  const updated = updateByHeaders_(CONFIG.SHEETS.USERS, user._row, {
    password_hash: passwordDigest_(newPassword, salt),
    password_salt: salt,
    password_version: 'V' + (Number(String(user.password_version || 'V1').replace('V','')) + 1),
    must_change_password: false,
    credential_state: 'PROVISIONED',
    updated_at: nowIso_()
  });
  audit_(session.username, 'CHANGE_PASSWORD', 'USER', user.user_id, before,
    {must_change_password: updated.must_change_password, password_version: updated.password_version}, 'PASS');
  return {ok: true};
}
