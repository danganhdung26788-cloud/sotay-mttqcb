function bool_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE' || String(v) === '1';
}
function adminLogin_(username, password) {
  const uname = normalizeUsername_(username || 'unknown');
  const key = 'LOGIN_FAIL:' + uname;
  const cache = CacheService.getScriptCache();
  const failed = Number(cache.get(key) || 0);
  if (failed >= 5) throw new Error('Tài khoản tạm khóa đăng nhập. Thử lại sau 15 phút.');
  try {
    const result = login_(username, password);
    const user = findBy_(CONFIG.SHEETS.USERS, 'user_id', result.user.user_id);
    const session = requireSession_(result.token);
    session.password_version = passwordVersion_(user);
    cache.put('SESSION:' + result.token, JSON.stringify(session), CONFIG.AUTH.SESSION_TTL_SECONDS);
    result.user.password_version = session.password_version;
    cache.remove(key);
    return result;
  } catch (e) {
    cache.put(key, String(failed + 1), 900);
    throw e;
  }
}
function isProvinceAdmin_(session) {
  return session && (session.role_id === 'PROVINCIAL_ADMIN' || session.role_id === 'SUPER_ADMIN');
}
function getLiveUser_(session) {
  const user = findBy_(CONFIG.SHEETS.USERS, 'user_id', session.user_id);
  if (!user || String(user.status) !== 'ACTIVE') throw new Error('Tài khoản không còn hoạt động.');
  return user;
}
function requireAdminSession_(token, options) {
  options = options || {};
  const session = requireSession_(token);
  const user = getLiveUser_(session);
  if (String(session.password_version || 'V1') !== passwordVersion_(user)) {
    CacheService.getScriptCache().remove('SESSION:' + token);
    throw new Error('Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.');
  }
  const mustChange = bool_(user.must_change_password);
  if (mustChange && !options.allowPasswordChange) throw new Error('MUST_CHANGE_PASSWORD');
  return {
    session: Object.assign({}, session, {
      role_id: String(user.role_id),
      scope_org_id: String(user.scope_org_id || ''),
      must_change_password: mustChange,
      password_version: passwordVersion_(user)
    }),
    user: user
  };
}
function scopedOrgIds_(session) {
  const orgs = tableObjects_(CONFIG.SHEETS.ORGANIZATIONS);
  if (isProvinceAdmin_(session)) return new Set(orgs.map(x => String(x.org_id)));
  const set = new Set([String(session.scope_org_id)]);
  orgs.forEach(o => {
    if (String(o.parent_org_id) === String(session.scope_org_id) && Number(o.level) === 3) set.add(String(o.org_id));
  });
  return set;
}
function adminBootstrap_(token) {
  const auth = requireAdminSession_(token, {allowPasswordChange:true});
  const session = auth.session;
  const result = {
    user: {
      user_id:String(auth.user.user_id),
      username:String(auth.user.username),
      display_name:String(auth.user.display_name),
      role_id:String(auth.user.role_id),
      scope_org_id:String(auth.user.scope_org_id || ''),
      must_change_password:bool_(auth.user.must_change_password)
    },
    app:{name:CONFIG.APP_NAME,version:CONFIG.VERSION},
    organizations:[], groups:[], stats:{},
    phase4:{
      review_mode:setting_('UNIT_ADMIN_REVIEW_MODE','OPTIONAL'),
      public_avatar_sharing:settingBool_('PUBLIC_AVATAR_SHARING',false),
      can_review:isProvinceAdmin_(session),
      can_backup:isProvinceAdmin_(session)
    }
  };
  if (result.user.must_change_password) return result;
  const allowed = scopedOrgIds_(session);
  result.organizations = tableObjects_(CONFIG.SHEETS.ORGANIZATIONS)
    .filter(o => allowed.has(String(o.org_id)))
    .map(o => ({
      org_id:String(o.org_id), parent_org_id:String(o.parent_org_id || ''),
      level:Number(o.level || 0), org_type:String(o.org_type || ''),
      org_name:String(o.org_name || ''), sort_order:Number(o.sort_order || 9999),
      status:String(o.status || '')
    }))
    .sort((a,b) => a.level-b.level || a.sort_order-b.sort_order || a.org_name.localeCompare(b.org_name,'vi'));
  result.groups = tableObjects_(CONFIG.SHEETS.GROUPS)
    .filter(g => allowed.has(String(g.org_id)) && String(g.status) === 'ACTIVE')
    .map(g => ({
      group_id:String(g.group_id), org_id:String(g.org_id),
      group_name:String(g.group_name), sort_order:Number(g.sort_order || 9999)
    }))
    .sort((a,b) => a.sort_order-b.sort_order);
  const contacts = tableObjects_(CONFIG.SHEETS.CONTACTS).filter(c => allowed.has(String(c.org_id)));
  const pendingReviews = tableObjects_(CONFIG.SHEETS.REVIEW_REQUESTS)
    .filter(r => String(r.status) === 'PENDING' && (isProvinceAdmin_(session) || allowed.has(String(r.org_id))));
  result.stats = {
    organizations:result.organizations.length,
    level3:result.organizations.filter(o => o.level === 3 && o.status === 'ACTIVE').length,
    contacts:contacts.filter(c => String(c.status) === 'ACTIVE').length,
    review:contacts.filter(c => String(c.data_quality) === 'REVIEW').length,
    pending_reviews:pendingReviews.length
  };
  return result;
}
function adminLogout_(token) { return logout_(token); }
function adminChangePasswordPhase4_(token, currentPassword, newPassword) {
  const result = changePassword_(token, currentPassword, newPassword);
  const session = requireSession_(token);
  const user = findBy_(CONFIG.SHEETS.USERS, 'user_id', session.user_id);
  session.password_version = passwordVersion_(user);
  session.must_change_password = false;
  CacheService.getScriptCache().put('SESSION:' + token, JSON.stringify(session), CONFIG.AUTH.SESSION_TTL_SECONDS);
  return result;
}
