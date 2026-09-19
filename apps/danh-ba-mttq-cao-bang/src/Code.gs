function doGet(e) {
  const view=String((e&&e.parameter&&e.parameter.view)||'').toLowerCase();
  return view==='admin' ? renderAdmin_() : renderIndex_();
}
function publicApi(action,payload) {
  payload=payload||{};
  switch(action){
    case 'bootstrap': return getPublicDirectoryData(!!payload.forceRefresh);
    case 'stats': return getPublicStats();
    default: throw new Error('Public action không hợp lệ: '+action);
  }
}
function adminApi(action,payload) {
  payload=payload||{};
  switch(action){
    case 'login': return adminLogin(payload.username,payload.password);
    case 'bootstrap': return adminBootstrap(payload.token);
    case 'logout': return adminLogout(payload.token);
    case 'changePassword': return adminChangePasswordPhase4(payload.token,payload.currentPassword,payload.newPassword);
    case 'listContacts': return listAdminContacts(payload.token,payload.filters);
    case 'createContact':
    case 'updateContact': return adminSaveContactPhase4(payload.token,payload.data);
    case 'setContactStatus': return adminSetContactStatusPhase4(payload.token,payload.contact_id,payload.status,payload.submit_for_review);
    case 'moveContacts': return adminMoveContacts(payload.token,payload.contact_ids,payload.target_org_id);
    case 'listLevel3': return listLevel3Organizations(payload.token);
    case 'createLevel3': return adminCreateLevel3(payload.token,payload.data);
    case 'updateLevel3': return adminUpdateLevel3(payload.token,payload.data);
    case 'setLevel3Status': return adminSetLevel3Status(payload.token,payload.org_id,payload.status);
    case 'listUsers': return listAdminUsers(payload.token);
    case 'resetUserPassword': return adminResetUserPassword(payload.token,payload.user_id,payload.temporary_password);
    case 'setUserStatus': return adminSetUserStatus(payload.token,payload.user_id,payload.status);
    case 'previewImport': return previewImportContacts(payload.token,payload.target_org_id,payload.rows);
    case 'commitImport': return commitImportContactsPhase4(payload.token,payload.target_org_id,payload.rows);
    case 'exportCsv': return exportContactsCsv(payload.token,payload.org_id);
    case 'listAudit': return listAdminAudit(payload.token,payload.limit);
    case 'uploadAvatar': return adminUploadAvatar(payload.token,payload.contact_id,payload.file);
    case 'removeAvatar': return adminRemoveAvatar(payload.token,payload.contact_id);
    case 'listReviewRequests': return listReviewRequests(payload.token,payload.status);
    case 'reviewRequest': return adminReviewRequest(payload.token,payload.request_id,payload.decision,payload.note);
    case 'createBackup': return adminCreateDatabaseBackup(payload.token,payload.note);
    case 'listBackups': return adminListBackups(payload.token,payload.limit);
    case 'previewRestore': return adminPreviewRestore(payload.token,payload.backup_file_id);
    case 'restoreOperationalData': return adminRestoreOperationalData(payload.token,payload.backup_file_id,payload.confirmation);
    case 'phase4Regression': return runPhase4RegressionTests();
    case 'phase4ScopeSmoke': return runPhase4ScopeSmokeTest(payload.token);
    default: throw new Error('Admin action không hợp lệ: '+action);
  }
}
