function doGet(e) {
  const view=String((e&&e.parameter&&e.parameter.view)||'').toLowerCase();
  return view==='admin' ? renderAdmin_() : renderIndex_();
}
function publicApi(action,payload) {
  payload=payload||{};
  switch(action){
    case 'bootstrap': return getPublicDirectoryData_(!!payload.forceRefresh);
    case 'stats': return getPublicStats_();
    default: throw new Error('Public action không hợp lệ: '+action);
  }
}
function adminApi(action,payload) {
  payload=payload||{};
  switch(action){
    case 'login': return adminLogin_(payload.username,payload.password);
    case 'bootstrap': return adminBootstrap_(payload.token);
    case 'logout': return adminLogout_(payload.token);
    case 'changePassword': return adminChangePasswordPhase4_(payload.token,payload.currentPassword,payload.newPassword);
    case 'listContacts': return listAdminContacts_(payload.token,payload.filters);
    case 'createContact':
    case 'updateContact': return adminSaveContactPhase4_(payload.token,payload.data);
    case 'setContactStatus': return adminSetContactStatusPhase4_(payload.token,payload.contact_id,payload.status,payload.submit_for_review);
    case 'moveContacts': return adminMoveContacts_(payload.token,payload.contact_ids,payload.target_org_id);
    case 'listLevel3': return listLevel3Organizations_(payload.token);
    case 'createLevel3': return adminCreateLevel3_(payload.token,payload.data);
    case 'updateLevel3': return adminUpdateLevel3_(payload.token,payload.data);
    case 'setLevel3Status': return adminSetLevel3Status_(payload.token,payload.org_id,payload.status);
    case 'listUsers': return listAdminUsers_(payload.token);
    case 'resetUserPassword': return adminResetUserPassword_(payload.token,payload.user_id,payload.temporary_password);
    case 'setUserStatus': return adminSetUserStatus_(payload.token,payload.user_id,payload.status);
    case 'previewImport': return previewImportContacts_(payload.token,payload.target_org_id,payload.rows);
    case 'commitImport': return commitImportContactsPhase4_(payload.token,payload.target_org_id,payload.rows);
    case 'exportCsv': return exportContactsCsv_(payload.token,payload.org_id);
    case 'listAudit': return listAdminAudit_(payload.token,payload.limit);
    case 'uploadAvatar': return adminUploadAvatar_(payload.token,payload.contact_id,payload.file);
    case 'removeAvatar': return adminRemoveAvatar_(payload.token,payload.contact_id);
    case 'listReviewRequests': return listReviewRequests_(payload.token,payload.status);
    case 'reviewRequest': return adminReviewRequest_(payload.token,payload.request_id,payload.decision,payload.note);
    case 'createBackup': return adminCreateDatabaseBackup_(payload.token,payload.note);
    case 'listBackups': return adminListBackups_(payload.token,payload.limit);
    case 'previewRestore': return adminPreviewRestore_(payload.token,payload.backup_file_id);
    case 'restoreOperationalData': return adminRestoreOperationalData_(payload.token,payload.backup_file_id,payload.confirmation);
    case 'phase4Regression': return runPhase4RegressionTests_();
    case 'phase4ScopeSmoke': return runPhase4ScopeSmokeTest_(payload.token);
    default: throw new Error('Admin action không hợp lệ: '+action);
  }
}
