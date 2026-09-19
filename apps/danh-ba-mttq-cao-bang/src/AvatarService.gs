function avatarAllowedMime_() {
  return String(setting_('ALLOWED_AVATAR_MIME','image/jpeg,image/png,image/webp'))
    .split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
}

function avatarMaxBytes_() {
  return Math.min(
    settingInt_('MAX_AVATAR_BYTES', CONFIG.LIMITS.MAX_AVATAR_BYTES),
    CONFIG.LIMITS.MAX_AVATAR_BYTES
  );
}

function unsignedByte_(value) {
  const n = Number(value || 0);
  return n < 0 ? n + 256 : n;
}

function avatarMagicMatches_(mime, bytes) {
  const b = index => unsignedByte_(bytes[index]);
  if (mime === 'image/jpeg') {
    return bytes.length >= 3 && b(0) === 0xFF && b(1) === 0xD8 && b(2) === 0xFF;
  }
  if (mime === 'image/png') {
    const sig = [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A];
    return bytes.length >= sig.length && sig.every((v,i) => b(i) === v);
  }
  if (mime === 'image/webp') {
    const text = indexes => indexes.map(i => String.fromCharCode(b(i))).join('');
    return bytes.length >= 12 && text([0,1,2,3]) === 'RIFF' && text([8,9,10,11]) === 'WEBP';
  }
  return false;
}

function adminUploadAvatar(token, contactId, payload) {
  const auth = requireAdminSession_(token);
  const contact = findBy_(CONFIG.SHEETS.CONTACTS,'contact_id',contactId);
  if (!contact) throw new Error('Không tìm thấy cán bộ.');
  requireOrgWrite_(auth.session, contact.org_id);

  payload = payload || {};
  const mime = String(payload.mime_type || '').toLowerCase();
  if (!avatarAllowedMime_().includes(mime)) throw new Error('Định dạng ảnh không được hỗ trợ.');

  const raw = String(payload.base64 || '')
    .replace(/^data:[^;]+;base64,/, '')
    .replace(/\s+/g, '');
  if (!raw) throw new Error('Dữ liệu ảnh trống.');

  const maxBytes = avatarMaxBytes_();
  const maxEncodedChars = Math.ceil(maxBytes / 3) * 4 + 8;
  if (raw.length > maxEncodedChars) throw new Error('Ảnh vượt quá dung lượng cho phép.');

  let bytes;
  try {
    bytes = Utilities.base64Decode(raw);
  } catch (e) {
    throw new Error('Dữ liệu ảnh không hợp lệ.');
  }

  if (bytes.length > maxBytes) throw new Error('Ảnh vượt quá dung lượng cho phép.');
  if (!avatarMagicMatches_(mime, bytes)) throw new Error('Nội dung tệp không khớp định dạng ảnh đã khai báo.');

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
      audit_(
        auth.session.username,
        'AVATAR_SHARE_WARNING',
        'CONTACT',
        contactId,
        null,
        {file_id:file.getId(),message:sanitizeText_(e.message || e,300)},
        'WARNING'
      );
    }
  }

  const before={avatar_file_id:String(contact.avatar_file_id || '')};
  updateByHeaders_(CONFIG.SHEETS.CONTACTS,contact._row,{
    avatar_file_id:file.getId(),
    updated_at:nowIso_()
  });
  audit_(
    auth.session.username,
    'UPLOAD_AVATAR',
    'CONTACT',
    contactId,
    before,
    {avatar_file_id:file.getId(),public_shared:shared},
    'PASS'
  );
  invalidatePublicDirectoryCache_();

  return {ok:true,contact_id:contactId,file_id:file.getId(),public_shared:shared};
}

function adminRemoveAvatar(token, contactId) {
  const auth = requireAdminSession_(token);
  const contact = findBy_(CONFIG.SHEETS.CONTACTS,'contact_id',contactId);
  if (!contact) throw new Error('Không tìm thấy cán bộ.');
  requireOrgWrite_(auth.session,contact.org_id);

  const before={avatar_file_id:String(contact.avatar_file_id || '')};
  updateByHeaders_(CONFIG.SHEETS.CONTACTS,contact._row,{
    avatar_file_id:'',
    updated_at:nowIso_()
  });
  audit_(auth.session.username,'REMOVE_AVATAR','CONTACT',contactId,before,{avatar_file_id:''},'PASS');
  invalidatePublicDirectoryCache_();
  return {ok:true};
}
