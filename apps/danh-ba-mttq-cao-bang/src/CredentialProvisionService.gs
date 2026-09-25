function csvCell_(value) {
  const s = String(value == null ? '' : value);
  return '"' + s.replace(/"/g, '""') + '"';
}

function generateTemporaryPassword_(userId) {
  const seed = [
    Utilities.getUuid(),
    Utilities.getUuid(),
    String(userId || ''),
    String(new Date().getTime())
  ].join('|');
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    seed,
    Utilities.Charset.UTF_8
  );
  const b64 = Utilities.base64EncodeWebSafe(bytes).replace(/[^A-Za-z0-9]/g, '');
  return 'Cb!' + b64.slice(0, 16) + 'a9';
}

function pendingCredentialUsers_() {
  return tableObjects_(CONFIG.SHEETS.USERS).filter(u => {
    if (String(u.status) !== 'ACTIVE') return false;
    return String(u.credential_state || '') === 'PENDING_PROVISION' ||
      !String(u.password_hash || '').trim() ||
      !String(u.password_salt || '').trim();
  });
}

function assertPrivateCredentialFile_(file) {
  if (!file) throw new Error('Không tạo được file bàn giao credential.');
  if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) {
    throw new Error('Credential handoff file không ở chế độ PRIVATE.');
  }
  if (file.getEditors().length !== 0 || file.getViewers().length !== 0) {
    throw new Error('Credential handoff file có quyền truy cập ngoài chủ sở hữu.');
  }
  file.setShareableByEditors(false);
}

function provisionPendingCredentials_() {
  return withScriptLock_(30000, () => {
    const targets = pendingCredentialUsers_();
    if (!targets.length) {
      return {
        ok:true,
        count:0,
        no_change:true,
        credential_state:'PROVISIONED'
      };
    }

    const generated = targets.map(u => ({
      user:u,
      temporary_password:generateTemporaryPassword_(u.user_id),
      salt:Utilities.getUuid().replace(/-/g, '')
    }));

    const rows = [
      ['username','display_name','role_id','scope_org_id','temporary_password','must_change_password']
    ];
    generated.forEach(x => rows.push([
      String(x.user.username || ''),
      String(x.user.display_name || ''),
      String(x.user.role_id || ''),
      String(x.user.scope_org_id || ''),
      x.temporary_password,
      'TRUE'
    ]));

    const csv = '\uFEFF' + rows.map(r => r.map(csvCell_).join(',')).join('\r\n');
    const stamp = Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyyMMdd_HHmmss');
    const nonce = Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();
    const fileName = 'DANH_BA_CREDENTIAL_HANDOFF_' + stamp + '_' + nonce + '.csv';

    let file = null;
    const before = generated.map(x => ({
      row:x.user._row,
      password_hash:x.user.password_hash,
      password_salt:x.user.password_salt,
      credential_state:x.user.credential_state,
      must_change_password:x.user.must_change_password,
      password_version:x.user.password_version,
      updated_at:x.user.updated_at
    }));
    let applied = 0;

    try {
      file = DriveApp.createFile(fileName, csv, MimeType.CSV);
      assertPrivateCredentialFile_(file);

      generated.forEach((x, i) => {
        updateByHeaders_(CONFIG.SHEETS.USERS, x.user._row, {
          password_hash:passwordDigest_(x.temporary_password, x.salt),
          password_salt:x.salt,
          credential_state:'PROVISIONED',
          must_change_password:true,
          password_version:String(x.user.password_version || 'V1'),
          updated_at:nowIso_()
        });
        applied = i + 1;
      });

      PropertiesService.getScriptProperties().setProperties({
        LAST_CREDENTIAL_HANDOFF_FILE_ID:file.getId(),
        LAST_CREDENTIAL_HANDOFF_FILE_NAME:fileName,
        LAST_CREDENTIAL_HANDOFF_AT:nowIso_()
      }, false);

      audit_(
        'SYSTEM',
        'PROVISION_PENDING_CREDENTIALS',
        'USERS',
        'PENDING',
        null,
        {count:generated.length,handoff_file_name:fileName},
        'PASS'
      );

      return {
        ok:true,
        count:generated.length,
        no_change:false,
        credential_state:'PROVISIONED',
        handoff_file_name:fileName
      };
    } catch (err) {
      for (let i = 0; i < applied; i++) {
        const b = before[i];
        try {
          updateByHeaders_(CONFIG.SHEETS.USERS, b.row, {
            password_hash:b.password_hash,
            password_salt:b.password_salt,
            credential_state:b.credential_state,
            must_change_password:b.must_change_password,
            password_version:b.password_version,
            updated_at:b.updated_at
          });
        } catch (rollbackErr) {}
      }
      if (file) {
        try { file.setTrashed(true); } catch (trashErr) {}
      }
      audit_(
        'SYSTEM',
        'PROVISION_PENDING_CREDENTIALS',
        'USERS',
        'PENDING',
        null,
        {attempted:generated.length,applied_before_rollback:applied},
        'FAIL'
      );
      throw err;
    }
  });
}
