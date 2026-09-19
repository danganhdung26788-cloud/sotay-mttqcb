function listAdminUsers(token) {
  const auth = requireAdminSession_(token);
  let rows = tableObjects_(CONFIG.SHEETS.USERS);
  if (!isProvinceAdmin_(auth.session)) rows = rows.filter(u => String(u.user_id) === String(auth.session.user_id));
  return rows.map(u => ({
    user_id:String(u.user_id), username:String(u.username), display_name:String(u.display_name),
    role_id:String(u.role_id), scope_org_id:String(u.scope_org_id || ''), status:String(u.status),
    must_change_password:bool_(u.must_change_password), credential_state:String(u.credential_state || ''),
    password_version:String(u.password_version || 'V1'), last_login:String(u.last_login || '')
  }));
}
function adminResetUserPassword(token, userId, temporaryPassword) {
  const auth = requireAdminSession_(token);
  requireProvinceAdmin_(auth.session);
  if (!temporaryPassword || String(temporaryPassword).length < CONFIG.AUTH.MIN_PASSWORD_LENGTH) throw new Error('Mật khẩu tạm không đạt yêu cầu.');
  const user = findBy_(CONFIG.SHEETS.USERS, 'user_id', userId);
  if (!user) throw new Error('Không tìm thấy tài khoản.');
  const salt = Utilities.getUuid().replace(/-/g,'');
  const oldVersion = Number(String(user.password_version || 'V1').replace('V','')) || 1;
  const before = {credential_state:user.credential_state,must_change_password:user.must_change_password,password_version:user.password_version};
  updateByHeaders_(CONFIG.SHEETS.USERS,user._row,{
    password_hash:passwordDigest_(temporaryPassword,salt),
    password_salt:salt,
    credential_state:'PROVISIONED',
    must_change_password:true,
    password_version:'V' + (oldVersion + 1),
    updated_at:nowIso_()
  });
  audit_(auth.session.username,'RESET_USER_PASSWORD','USER',userId,before,
    {credential_state:'PROVISIONED',must_change_password:true,password_version:'V'+(oldVersion+1)},'PASS');
  return {ok:true,user_id:userId};
}
function adminSetUserStatus(token, userId, status) {
  const auth = requireAdminSession_(token);
  requireProvinceAdmin_(auth.session);
  if (!['ACTIVE','INACTIVE','LOCKED'].includes(String(status))) throw new Error('Trạng thái không hợp lệ.');
  const user = findBy_(CONFIG.SHEETS.USERS,'user_id',userId);
  if (!user) throw new Error('Không tìm thấy tài khoản.');
  if (String(user.user_id) === String(auth.session.user_id) && status !== 'ACTIVE') throw new Error('Không thể tự khóa tài khoản đang đăng nhập.');
  const before={status:user.status};
  const updated=updateByHeaders_(CONFIG.SHEETS.USERS,user._row,{status:String(status),updated_at:nowIso_()});
  audit_(auth.session.username,'SET_USER_STATUS','USER',userId,before,{status:String(status)},'PASS');
  return {ok:true,status:String(updated.status)};
}
