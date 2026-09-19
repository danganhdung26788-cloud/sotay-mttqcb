function avatarAllowedMime_() {
  return String(setting_('ALLOWED_AVATAR_MIME','image/jpeg,image/png,image/webp'))
    .split(',').map(x => x.trim()).filter(Boolean);
}
function avatarMaxBytes_() {
  return Math.min(settingInt_('MAX_AVATAR_BYTES', CONFIG.LIMITS.MAX_AVATAR_BYTES), CONFIG.LIMITS.MAX_AVATAR_BYTES);
}
function adminUploadAvatar(token, contactId, payload) {
  const auth = requireAdminSession_(token);
  const contact = findBy_(CONFIG.SHEETS.CONTACTS,'contact_id',contactId);
  if (!contact) throw new Error('Không tìm thấy cán bộ.');
  requireOrgWrite_(auth.session, contact.org_id);
  payload = payload || {};
  const mime = String(payload.mime_type || '').toLowerCase();
  if (!avatarAllowedMime_().includes(mime)) throw new Error('Định dạng ảnh không được hỗ trợ.');
  const raw = String(payload.base64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!raw) throw new Error('Dữ liệu ảnh trống.');
  const bytes = Utilities.base64Decode(raw);
  if (bytes.length > avatarMaxBytes_()) throw new Error('Ảnh vượt quá dung lượng cho phép.');
  const folderId = setting_('AVATAR_FOLDER_ID','');
  if (!folderId) throw new Error('Chưa cấu hình thư mục avatar.');
  const safeName = 'avatar_' + String(contactId).replace(/[^A-Za-z0-9_-]/g,'') + '_' +
    Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyyMMdd_HHmmss') +
    (mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg');
  const blob = Utilities.newBlob(bytes,mime,safeName);
  const file = DriveApp.getFolderById(folderId).createFile(blob);
  file.setDescription('Avatar Danh bạ MTTQ Cao Bằng - ' + contactId);
  let shared = false;
  if (settingBool_('PUBLIC_AVATAR_SHARING',false)) {
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
      shared = true;
    } catch (e) {
      audit_(auth.session.username,'AVATAR_SHARE_WARNING','CONTACT',contactId,null,{file_id:file.getId(),message:String(e.message || e)},'WARNING');
    }
  }
  const before={avatar_file_id:String(contact.avatar_file_id || '')};
  updateByHeaders_(CONFIG.SHEETS.CONTACTS,contact._row,{avatar_file_id:file.getId(),updated_at:nowIso_()});
  audit_(auth.session.username,'UPLOAD_AVATAR','CONTACT',contactId,before,{avatar_file_id:file.getId(),public_shared:shared},'PASS');
  invalidatePublicDirectoryCache_();
  return {ok:true,contact_id:contactId,file_id:file.getId(),public_shared:shared};
}
function adminRemoveAvatar(token, contactId) {
  const auth = requireAdminSession_(token);
  const contact = findBy_(CONFIG.SHEETS.CONTACTS,'contact_id',contactId);
  if (!contact) throw new Error('Không tìm thấy cán bộ.');
  requireOrgWrite_(auth.session,contact.org_id);
  const before={avatar_file_id:String(contact.avatar_file_id || '')};
  updateByHeaders_(CONFIG.SHEETS.CONTACTS,contact._row,{avatar_file_id:'',updated_at:nowIso_()});
  audit_(auth.session.username,'REMOVE_AVATAR','CONTACT',contactId,before,{avatar_file_id:''},'PASS');
  invalidatePublicDirectoryCache_();
  return {ok:true};
}
