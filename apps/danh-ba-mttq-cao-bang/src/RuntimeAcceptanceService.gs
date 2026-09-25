const RUNTIME_ACCEPTANCE_STATE_KEY_ = 'DANH_BA_RUNTIME_ACCEPTANCE_STATE';

function runtimeAcceptanceAssert_(condition, testName) {
  if (condition) return;
  const err = new Error('ACCEPTANCE_ASSERTION_FAILED');
  err.acceptance_test = String(testName || 'unknown');
  throw err;
}

function runtimeAcceptanceExpectDenied_(testName, fn) {
  let denied = false;
  try {
    fn();
  } catch (e) {
    denied = true;
  }
  runtimeAcceptanceAssert_(denied, testName);
}

function runtimeAcceptanceState_() {
  const raw = PropertiesService.getScriptProperties().getProperty(RUNTIME_ACCEPTANCE_STATE_KEY_);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveRuntimeAcceptanceState_(state) {
  PropertiesService.getScriptProperties().setProperty(
    RUNTIME_ACCEPTANCE_STATE_KEY_,
    JSON.stringify(state || {})
  );
}

function clearRuntimeAcceptanceState_() {
  PropertiesService.getScriptProperties().deleteProperty(RUNTIME_ACCEPTANCE_STATE_KEY_);
}

function runtimePrivateDriveItem_(item) {
  if (!item) return false;
  try {
    return item.getSharingAccess() === DriveApp.Access.PRIVATE &&
      item.getEditors().length === 0 &&
      item.getViewers().length === 0;
  } catch (e) {
    return false;
  }
}

function runtimeSetSetting_(key, value) {
  const row = findBy_(CONFIG.SHEETS.SETTINGS, 'key', key);
  if (row) {
    updateByHeaders_(CONFIG.SHEETS.SETTINGS, row._row, {value:String(value)});
  } else {
    appendObject_(CONFIG.SHEETS.SETTINGS, {key:String(key), value:String(value)});
  }
  invalidateSettingsCache_();
}

function runtimeRandomTestPassword_(label) {
  const seed = [
    String(label || ''),
    Utilities.getUuid(),
    Utilities.getUuid(),
    String(new Date().getTime())
  ].join('|');
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    seed,
    Utilities.Charset.UTF_8
  );
  const b64 = Utilities.base64EncodeWebSafe(bytes).replace(/[^A-Za-z0-9]/g,'');
  return 'T!' + b64.slice(0,18) + 'a9';
}

function runtimeCreateAcceptanceUser_(roleId, scopeOrgId, label) {
  const nonce = Utilities.getUuid().replace(/-/g,'').slice(0,12).toLowerCase();
  const userId = 'USR_ACC_' + nonce.toUpperCase();
  const username = 'accept.' + String(label || 'user').toLowerCase() + '.' + nonce;
  const password = runtimeRandomTestPassword_(username);
  const salt = Utilities.getUuid().replace(/-/g,'');
  appendObject_(CONFIG.SHEETS.USERS, {
    user_id:userId,
    username:username,
    display_name:'Runtime Acceptance ' + String(label || 'User'),
    role_id:String(roleId),
    scope_org_id:String(scopeOrgId || ''),
    status:'ACTIVE',
    must_change_password:false,
    credential_state:'PROVISIONED',
    password_hash:passwordDigest_(password,salt),
    password_salt:salt,
    password_version:'V1',
    last_login:'',
    created_at:nowIso_(),
    updated_at:nowIso_()
  });
  return {user_id:userId,username:username,password:password};
}

function runtimeUniquePhone_() {
  for (let i = 0; i < 50; i++) {
    let digits = (Utilities.getUuid() + Utilities.getUuid()).replace(/\D/g,'');
    digits = (digits + '00000000').slice(0,8);
    const phone = '09' + digits;
    const exists = tableObjects_(CONFIG.SHEETS.CONTACTS).some(c =>
      normalizePhone_(c.phone_normalized || c.phone) === phone
    );
    if (!exists) return phone;
  }
  throw new Error('ACCEPTANCE_UNIQUE_PHONE_FAILED');
}

function runtimeForbiddenPublicKey_(value) {
  const forbidden = new Set([
    'password','password_hash','password_salt','password_version',
    'credential_state','must_change_password','users','audit_log',
    'review_requests','review_queue'
  ]);
  const walk = obj => {
    if (!obj || typeof obj !== 'object') return false;
    if (Array.isArray(obj)) return obj.some(walk);
    return Object.keys(obj).some(k => forbidden.has(String(k).toLowerCase()) || walk(obj[k]));
  };
  return walk(value);
}

function runtimeAcceptanceFailure_(phase, testName, results) {
  return {
    ok:false,
    gate:'BLOCKED',
    phase:String(phase),
    failed_test:String(testName || 'unexpected'),
    results:results || {}
  };
}

function trashFolderTree_(folder) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    try { files.next().setTrashed(true); } catch (e) {}
  }
  const folders = folder.getFolders();
  while (folders.hasNext()) {
    const child = folders.next();
    try { trashFolderTree_(child); } catch (e) {}
    try { child.setTrashed(true); } catch (e) {}
  }
  try { folder.setTrashed(true); } catch (e) {}
}

function runtimeAcceptanceCleanupInternal_() {
  const state = runtimeAcceptanceState_();
  if (!state || !state.folder_id) {
    clearRuntimeAcceptanceState_();
    return {ok:true,no_change:true};
  }

  let cleaned = false;
  try {
    const folder = DriveApp.getFolderById(String(state.folder_id));
    trashFolderTree_(folder);
    cleaned = true;
  } finally {
    clearRuntimeAcceptanceState_();
  }
  return {ok:cleaned,no_change:false};
}

function runtimeAcceptancePrepare_(token) {
  requireRuntimeGateToken_(token);
  const prior = runtimeAcceptanceState_();
  if (prior) {
    try {
      runtimeAcceptanceCleanupInternal_();
    } catch (e) {
      return runtimeAcceptanceFailure_('prepare','STALE_ACCEPTANCE_CLEANUP',{});
    }
  }

  const stamp = Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyyMMdd_HHmmss');
  const nonce = Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();
  const folder = DriveApp.createFolder('DANH_BA_ACCEPTANCE_' + stamp + '_' + nonce);

  if (!runtimePrivateDriveItem_(folder)) {
    try { folder.setTrashed(true); } catch (e) {}
    return runtimeAcceptanceFailure_('prepare','PRIVATE_TEST_FOLDER',{});
  }

  const source = DriveApp.getFileById(CONFIG.DB_ID);
  const clone = source.makeCopy('DANH_BA_ACCEPTANCE_CLONE_' + stamp + '_' + nonce, folder);
  if (!runtimePrivateDriveItem_(clone)) {
    try { trashFolderTree_(folder); } catch (e) {}
    return runtimeAcceptanceFailure_('prepare','PRIVATE_CLONE',{});
  }

  const state = {
    folder_id:folder.getId(),
    clone_id:clone.getId(),
    created_at:nowIso_()
  };
  saveRuntimeAcceptanceState_(state);

  try {
    const result = withRuntimeDbOverride_(state.clone_id, () => {
      invalidateSettingsCache_();
      invalidatePublicDirectoryCache_();
      runtimeSetSetting_('AVATAR_FOLDER_ID', state.folder_id);
      runtimeSetSetting_('BACKUP_ROOT_FOLDER_ID', state.folder_id);
      runtimeSetSetting_('PUBLIC_AVATAR_SHARING', 'FALSE');
      runtimeSetSetting_('UNIT_ADMIN_REVIEW_MODE', 'OPTIONAL');

      const verify = verifyDatabase_();
      const ok = verify.ok &&
        verify.organizations === 57 &&
        verify.communes === 56 &&
        verify.contacts === 466 &&
        verify.users === 57 &&
        verify.commune_admins === 56;

      return {
        ok:ok,
        database:{
          organizations:verify.organizations,
          communes:verify.communes,
          contacts:verify.contacts,
          users:verify.users,
          commune_admins:verify.commune_admins
        }
      };
    });

    if (!result.ok) {
      runtimeAcceptanceCleanupInternal_();
      return runtimeAcceptanceFailure_('prepare','CLONE_BASELINE',result.database);
    }

    return {
      ok:true,
      gate:'PASS',
      phase:'prepare',
      clone_private:true,
      test_folder_private:true,
      database:result.database
    };
  } catch (e) {
    try { runtimeAcceptanceCleanupInternal_(); } catch (cleanupErr) {}
    return runtimeAcceptanceFailure_('prepare',e.acceptance_test || 'PREPARE_RUNTIME',{});
  }
}

function runtimeAcceptanceCore_(token) {
  requireRuntimeGateToken_(token);
  const state = runtimeAcceptanceState_();
  if (!state || !state.clone_id || !state.folder_id) {
    return runtimeAcceptanceFailure_('core','MISSING_ACCEPTANCE_STATE',{});
  }

  return withRuntimeDbOverride_(state.clone_id, () => {
    invalidateSettingsCache_();
    invalidatePublicDirectoryCache_();

    const results = {};
    const sessions = [];
    let currentTest = 'BOOTSTRAP';

    const mark = (name, condition) => {
      currentTest = name;
      runtimeAcceptanceAssert_(condition, name);
      results[name] = 'PASS';
    };
    const denied = (name, fn) => {
      currentTest = name;
      runtimeAcceptanceExpectDenied_(name, fn);
      results[name] = 'PASS';
    };

    try {
      currentTest = 'PUBLIC_DIRECTORY';
      const pub = getPublicDirectoryData_(true);
      mark('PUBLIC_DIRECTORY', !!pub && pub.organizations.length >= 57 && pub.contacts.length > 0);
      mark('PUBLIC_PAYLOAD_NO_INTERNALS', !runtimeForbiddenPublicKey_(pub));

      currentTest = 'ACCENT_INSENSITIVE_SEARCH';
      const probe = pub.contacts.find(c =>
        normalizeText_(c.full_name) !== String(c.full_name || '').toLowerCase()
      ) || pub.contacts[0];
      runtimeAcceptanceAssert_(!!probe, 'ACCENT_INSENSITIVE_SEARCH');
      const normalizedProbe = normalizeText_(probe.full_name);
      const query = normalizedProbe.split(' ').filter(Boolean).slice(-1)[0] || normalizedProbe;
      const matched = pub.contacts.some(c =>
        String(c.contact_id) === String(probe.contact_id) &&
        normalizeText_(c.full_name).includes(query)
      );
      mark('ACCENT_INSENSITIVE_SEARCH', matched);

      const orgs = tableObjects_(CONFIG.SHEETS.ORGANIZATIONS)
        .filter(o => Number(o.level) === 2 && String(o.status) === 'ACTIVE')
        .sort((a,b) => Number(a.sort_order || 9999) - Number(b.sort_order || 9999));
      mark('TWO_ACTIVE_LEVEL2_ORGS', orgs.length >= 2);
      const org1 = orgs[0];
      const org2 = orgs[1];

      currentTest = 'CREATE_TEST_USERS';
      const adminUser = runtimeCreateAcceptanceUser_('PROVINCIAL_ADMIN',CONFIG.ROOT_ORG_ID,'admin');
      const unit1User = runtimeCreateAcceptanceUser_('UNIT_ADMIN',org1.org_id,'unit1');
      const unit2User = runtimeCreateAcceptanceUser_('UNIT_ADMIN',org2.org_id,'unit2');
      results.CREATE_TEST_USERS = 'PASS';

      currentTest = 'LOGIN_PROVINCE_ADMIN';
      const adminLogin = adminLogin_(adminUser.username,adminUser.password);
      sessions.push(adminLogin.token);
      mark('LOGIN_PROVINCE_ADMIN', adminLogin.user.role_id === 'PROVINCIAL_ADMIN');
      mark('PROVINCE_ADMIN_BOOTSTRAP', !!adminBootstrap_(adminLogin.token));

      currentTest = 'LOGIN_UNIT_ADMIN_1';
      const unit1Login = adminLogin_(unit1User.username,unit1User.password);
      sessions.push(unit1Login.token);
      mark('LOGIN_UNIT_ADMIN_1',
        unit1Login.user.role_id === 'UNIT_ADMIN' &&
        String(unit1Login.user.scope_org_id) === String(org1.org_id));

      currentTest = 'LOGIN_UNIT_ADMIN_2';
      const unit2Login = adminLogin_(unit2User.username,unit2User.password);
      sessions.push(unit2Login.token);
      mark('LOGIN_UNIT_ADMIN_2',
        unit2Login.user.role_id === 'UNIT_ADMIN' &&
        String(unit2Login.user.scope_org_id) === String(org2.org_id));

      const crossRead = listAdminContacts_(unit1Login.token,{org_id:String(org2.org_id)});
      mark('CROSS_SCOPE_READ_FILTERED', Array.isArray(crossRead) && crossRead.length === 0);

      denied('CROSS_SCOPE_LEVEL3_WRITE_DENIED', () =>
        adminCreateLevel3_(unit1Login.token,{
          parent_org_id:String(org2.org_id),
          org_name:'Acceptance Cross Scope ' + Utilities.getUuid().slice(0,8),
          org_type:'VILLAGE'
        })
      );

      currentTest = 'LEVEL3_CREATE_OWN_SCOPE';
      const level3Name = 'Acceptance L3 ' + Utilities.getUuid().slice(0,8);
      const l3 = adminCreateLevel3_(unit1Login.token,{
        parent_org_id:String(org1.org_id),
        org_name:level3Name,
        org_type:'VILLAGE'
      });
      mark('LEVEL3_CREATE_OWN_SCOPE',
        Number(l3.level) === 3 && String(l3.parent_org_id) === String(org1.org_id));

      denied('LEVEL3_DUPLICATE_DENIED', () =>
        adminCreateLevel3_(unit1Login.token,{
          parent_org_id:String(org1.org_id),
          org_name:level3Name,
          org_type:'VILLAGE'
        })
      );

      currentTest = 'CONTACT_CREATE';
      let contact = adminCreateContact_(unit1Login.token,{
        org_id:String(org1.org_id),
        full_name:'Acceptance Contact',
        position:'Test',
        phone:runtimeUniquePhone_(),
        email:'acceptance@example.invalid',
        public_flag:true
      });
      mark('CONTACT_CREATE', !!contact.contact_id);

      currentTest = 'CONTACT_UPDATE';
      contact = adminUpdateContact_(unit1Login.token,{
        contact_id:contact.contact_id,
        org_id:String(org1.org_id),
        full_name:contact.full_name,
        phone:contact.phone,
        email:contact.email,
        position:'Updated Acceptance'
      });
      mark('CONTACT_UPDATE', String(contact.position) === 'Updated Acceptance');

      const inactive = adminSetContactStatus_(unit1Login.token,contact.contact_id,'INACTIVE');
      mark('CONTACT_STATUS_UPDATE', String(inactive.status) === 'INACTIVE');
      adminSetContactStatus_(unit1Login.token,contact.contact_id,'ACTIVE');

      denied('CROSS_SCOPE_CONTACT_MOVE_DENIED', () =>
        adminMoveContacts_(unit1Login.token,[contact.contact_id],String(org2.org_id))
      );

      const moved = adminMoveContacts_(unit1Login.token,[contact.contact_id],String(l3.org_id));
      mark('CONTACT_MOVE_OWN_LEVEL3', moved && moved.moved === 1);

      runtimeSetSetting_('UNIT_ADMIN_REVIEW_MODE','OPTIONAL');
      currentTest = 'REVIEW_OPTIONAL';
      const optionalReq = adminSaveContactPhase4_(unit1Login.token,{
        org_id:String(org1.org_id),
        full_name:'Acceptance Review Optional',
        position:'Optional',
        phone:runtimeUniquePhone_(),
        email:'',
        public_flag:true,
        submit_for_review:true
      });
      mark('REVIEW_OPTIONAL', optionalReq && optionalReq.queued === true);
      const optionalApproved = adminReviewRequest_(
        adminLogin.token,optionalReq.request.request_id,'APPROVE','Acceptance optional'
      );
      mark('REVIEW_OPTIONAL_APPROVE', optionalApproved.status === 'APPROVED');

      runtimeSetSetting_('UNIT_ADMIN_REVIEW_MODE','REQUIRED');
      currentTest = 'REVIEW_REQUIRED';
      const requiredReq = adminSaveContactPhase4_(unit1Login.token,{
        org_id:String(org1.org_id),
        full_name:'Acceptance Review Required',
        position:'Required',
        phone:runtimeUniquePhone_(),
        email:'',
        public_flag:true
      });
      mark('REVIEW_REQUIRED', requiredReq && requiredReq.queued === true);
      const requiredApproved = adminReviewRequest_(
        adminLogin.token,requiredReq.request.request_id,'APPROVE','Acceptance required'
      );
      mark('REVIEW_REQUIRED_APPROVE', requiredApproved.status === 'APPROVED');

      currentTest = 'STALE_REVIEW';
      const currentContact = findBy_(CONFIG.SHEETS.CONTACTS,'contact_id',contact.contact_id);
      const staleReq = adminSaveContactPhase4_(unit1Login.token,{
        contact_id:currentContact.contact_id,
        org_id:currentContact.org_id,
        full_name:currentContact.full_name,
        phone:currentContact.phone,
        email:currentContact.email,
        position:'Queued stale change'
      });
      mark('STALE_REVIEW_QUEUED', staleReq && staleReq.queued === true);

      adminUpdateContact_(adminLogin.token,{
        contact_id:currentContact.contact_id,
        org_id:currentContact.org_id,
        full_name:currentContact.full_name,
        phone:currentContact.phone,
        email:currentContact.email,
        position:'Intervening update'
      });

      denied('STALE_REVIEW_APPROVAL_DENIED', () =>
        adminReviewRequest_(
          adminLogin.token,staleReq.request.request_id,'APPROVE','Should be stale'
        )
      );
      const staleRow = findBy_(
        CONFIG.SHEETS.REVIEW_REQUESTS,'request_id',staleReq.request.request_id
      );
      mark('STALE_REVIEW_MARKED_ERROR', staleRow && String(staleRow.status) === 'ERROR');

      runtimeSetSetting_('UNIT_ADMIN_REVIEW_MODE','OPTIONAL');
      runtimeSetSetting_('PUBLIC_AVATAR_SHARING','FALSE');
      runtimeSetSetting_('AVATAR_FOLDER_ID',state.folder_id);

      currentTest = 'AVATAR_SAME_SCOPE';
      const png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZcVwAAAAASUVORK5CYII=';
      const avatar = adminUploadAvatar_(
        unit1Login.token,contact.contact_id,{mime_type:'image/png',base64:png1x1}
      );
      mark('AVATAR_SAME_SCOPE', avatar && avatar.ok === true && avatar.public_shared === false);

      denied('AVATAR_CROSS_SCOPE_DENIED', () =>
        adminUploadAvatar_(
          unit2Login.token,contact.contact_id,{mime_type:'image/png',base64:png1x1}
        )
      );
      denied('AVATAR_INVALID_SIGNATURE_DENIED', () =>
        adminUploadAvatar_(
          unit1Login.token,contact.contact_id,{
            mime_type:'image/png',
            base64:Utilities.base64Encode('not-a-png')
          }
        )
      );

      currentTest = 'PASSWORD_RESET_SESSION_INVALIDATION';
      const resetPassword = runtimeRandomTestPassword_('reset-unit2');
      adminResetUserPassword_(adminLogin.token,unit2User.user_id,resetPassword);
      denied('PASSWORD_RESET_INVALIDATES_OLD_SESSION', () =>
        adminBootstrap_(unit2Login.token)
      );
      const unit2Relogin = adminLogin_(unit2User.username,resetPassword);
      sessions.push(unit2Relogin.token);
      const unit2Bootstrap = adminBootstrap_(unit2Relogin.token);
      mark('RESET_PASSWORD_RELOGIN_MUST_CHANGE',
        unit2Bootstrap.user.must_change_password === true);

      const permanentPassword = runtimeRandomTestPassword_('changed-unit2');
      adminChangePasswordPhase4_(unit2Relogin.token,resetPassword,permanentPassword);
      const afterChange = adminBootstrap_(unit2Relogin.token);
      mark('CHANGE_PASSWORD_CLEARS_MUST_CHANGE',
        afterChange.user.must_change_password === false);

      return {
        ok:true,
        gate:'PASS',
        phase:'core',
        results:results
      };
    } catch (e) {
      return runtimeAcceptanceFailure_(
        'core',
        e.acceptance_test || currentTest || 'CORE_RUNTIME',
        results
      );
    } finally {
      sessions.forEach(t => {
        try { CacheService.getScriptCache().remove('SESSION:' + t); } catch (e) {}
      });
    }
  });
}

function runtimeAcceptanceRestore_(token) {
  requireRuntimeGateToken_(token);
  const state = runtimeAcceptanceState_();
  if (!state || !state.clone_id || !state.folder_id) {
    return runtimeAcceptanceFailure_('restore','MISSING_ACCEPTANCE_STATE',{});
  }

  return withRuntimeDbOverride_(state.clone_id, () => {
    invalidateSettingsCache_();
    invalidatePublicDirectoryCache_();
    runtimeSetSetting_('BACKUP_ROOT_FOLDER_ID',state.folder_id);

    const results = {};
    let currentTest = 'RESTORE_BOOTSTRAP';
    let adminToken = '';

    const mark = (name, condition) => {
      currentTest = name;
      runtimeAcceptanceAssert_(condition,name);
      results[name] = 'PASS';
    };
    const denied = (name, fn) => {
      currentTest = name;
      runtimeAcceptanceExpectDenied_(name,fn);
      results[name] = 'PASS';
    };

    try {
      const org = tableObjects_(CONFIG.SHEETS.ORGANIZATIONS)
        .find(o => Number(o.level) === 2 && String(o.status) === 'ACTIVE');
      mark('RESTORE_ACTIVE_ORG', !!org);

      currentTest = 'RESTORE_TEST_ADMIN';
      const adminUser = runtimeCreateAcceptanceUser_(
        'PROVINCIAL_ADMIN',CONFIG.ROOT_ORG_ID,'restoreadmin'
      );
      const login = adminLogin_(adminUser.username,adminUser.password);
      adminToken = login.token;
      mark('RESTORE_ADMIN_LOGIN', !!adminToken);

      currentTest = 'BACKUP_CREATE';
      const backup = adminCreateDatabaseBackup_(
        adminToken,'Runtime acceptance clone backup'
      );
      mark('BACKUP_CREATE', backup && backup.ok === true && !!backup.file_id);

      const backupRow = tableObjects_(CONFIG.SHEETS.BACKUP_LOG)
        .find(r => String(r.backup_file_id) === String(backup.file_id));
      mark('BACKUP_LOG_READBACK',
        !!backupRow && String(backupRow.result) === 'PASS');

      denied('UNREGISTERED_RESTORE_PREVIEW_DENIED', () =>
        adminPreviewRestore_(
          adminToken,'NOT_REGISTERED_' + Utilities.getUuid().replace(/-/g,'')
        )
      );

      const preview = adminPreviewRestore_(adminToken,backup.file_id);
      mark('REGISTERED_RESTORE_PREVIEW', preview && preview.ok === true);

      currentTest = 'RESTORE_MARKER_CREATE';
      const marker = adminCreateContact_(adminToken,{
        org_id:String(org.org_id),
        full_name:'Acceptance Restore Marker',
        position:'Must disappear after restore',
        phone:runtimeUniquePhone_(),
        email:'',
        public_flag:false
      });
      mark('RESTORE_MARKER_CREATE', !!findBy_(
        CONFIG.SHEETS.CONTACTS,'contact_id',marker.contact_id
      ));

      currentTest = 'RESTORE_ON_CLONE';
      const restore = adminRestoreOperationalData_(
        adminToken,backup.file_id,'RESTORE_OPERATIONAL_DATA'
      );
      mark('RESTORE_ON_CLONE',
        restore && restore.ok === true && !!restore.safety_backup);

      mark('RESTORE_MARKER_REMOVED',
        !findBy_(CONFIG.SHEETS.CONTACTS,'contact_id',marker.contact_id));
      mark('RESTORE_USERS_NOT_RESTORED',
        !!findBy_(CONFIG.SHEETS.USERS,'user_id',adminUser.user_id));

      const logs = tableObjects_(CONFIG.SHEETS.BACKUP_LOG);
      mark('PRE_RESTORE_BACKUP_LOGGED',
        logs.some(r => String(r.mode) === 'PRE_RESTORE' && String(r.result) === 'PASS'));

      return {
        ok:true,
        gate:'PASS',
        phase:'restore',
        results:results
      };
    } catch (e) {
      return runtimeAcceptanceFailure_(
        'restore',
        e.acceptance_test || currentTest || 'RESTORE_RUNTIME',
        results
      );
    } finally {
      if (adminToken) {
        try { CacheService.getScriptCache().remove('SESSION:' + adminToken); } catch (e) {}
      }
    }
  });
}

function runtimeAcceptanceCleanup_(token) {
  requireRuntimeGateToken_(token);
  try {
    const out = runtimeAcceptanceCleanupInternal_();
    return {
      ok:out.ok === true,
      gate:out.ok === true ? 'PASS' : 'BLOCKED',
      phase:'cleanup',
      cleaned:out.ok === true,
      no_change:out.no_change === true
    };
  } catch (e) {
    clearRuntimeAcceptanceState_();
    return runtimeAcceptanceFailure_('cleanup','CLEANUP_RUNTIME',{});
  }
}
