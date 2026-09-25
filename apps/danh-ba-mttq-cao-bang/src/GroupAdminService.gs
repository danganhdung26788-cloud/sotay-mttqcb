function normalizeGroupType_(value) {
  const type = String(value || 'OTHER').toUpperCase();
  const allowed = ['PROVINCE_DEPARTMENT','ASSOCIATION','COMMUNE_GROUP','LEVEL3_GROUP','OTHER'];
  if (!allowed.includes(type)) throw new Error('Loại Ban/Nhóm không hợp lệ.');
  return type;
}

function requireGroupTargetOrg_(session, orgId) {
  const id = String(orgId || '');
  if (!id) throw new Error('Chưa chọn đơn vị.');
  requireOrgWrite_(session, id);
  const org = findBy_(CONFIG.SHEETS.ORGANIZATIONS, 'org_id', id);
  if (!org) throw new Error('Không tìm thấy đơn vị.');
  if (String(org.status) !== 'ACTIVE') throw new Error('Đơn vị đang ngừng sử dụng.');
  return org;
}

function normalizeGroupTypeForOrg_(org, value) {
  const type = normalizeGroupType_(value);
  const level = Number(org.level || 0);

  if (level === 1 && !['PROVINCE_DEPARTMENT','ASSOCIATION','OTHER'].includes(type)) {
    throw new Error('Cấp tỉnh chỉ dùng loại Ban/Bộ phận, Hội/Tổ chức hoặc Khác.');
  }
  if (level === 2 && !['COMMUNE_GROUP','OTHER'].includes(type)) {
    throw new Error('Cấp xã/phường chỉ dùng loại Ban/Bộ phận cấp xã hoặc Khác.');
  }
  if (level === 3 && !['LEVEL3_GROUP','OTHER'].includes(type)) {
    throw new Error('Cấp 3 chỉ dùng loại Nhóm/Bộ phận cấp 3 hoặc Khác.');
  }
  return type;
}

function assertUniqueGroupName_(orgId, groupName, excludeGroupId) {
  const normalized = normalizeText_(groupName);
  const duplicate = tableObjects_(CONFIG.SHEETS.GROUPS).find(g =>
    String(g.org_id) === String(orgId) &&
    String(g.group_id) !== String(excludeGroupId || '') &&
    String(g.status) === 'ACTIVE' &&
    normalizeText_(g.group_name) === normalized
  );
  if (duplicate) throw new Error('Ban/Nhóm cùng tên đã tồn tại trong đơn vị này.');
}

function listAdminGroups_(token, filters) {
  const auth = requireAdminSession_(token);
  filters = filters || {};
  const allowed = scopedOrgIds_(auth.session);

  let rows = tableObjects_(CONFIG.SHEETS.GROUPS)
    .filter(g => allowed.has(String(g.org_id)));

  if (filters.org_id) rows = rows.filter(g => String(g.org_id) === String(filters.org_id));
  if (filters.status) rows = rows.filter(g => String(g.status) === String(filters.status));
  if (filters.group_type) rows = rows.filter(g => String(g.group_type) === String(filters.group_type));

  const q = normalizeText_(filters.query || '');
  if (q) rows = rows.filter(g => normalizeText_(g.group_name).includes(q));

  const contacts = tableObjects_(CONFIG.SHEETS.CONTACTS);
  const counts = {};
  contacts.forEach(c => {
    const gid = String(c.group_id || '');
    if (!gid || String(c.status) !== 'ACTIVE') return;
    counts[gid] = Number(counts[gid] || 0) + 1;
  });

  return rows
    .sort((a,b) =>
      String(a.org_id).localeCompare(String(b.org_id)) ||
      Number(a.sort_order || 9999)-Number(b.sort_order || 9999) ||
      String(a.group_name).localeCompare(String(b.group_name),'vi'))
    .map(g => ({
      group_id:String(g.group_id || ''),
      org_id:String(g.org_id || ''),
      group_type:String(g.group_type || ''),
      group_name:String(g.group_name || ''),
      sort_order:Number(g.sort_order || 9999),
      status:String(g.status || ''),
      active_contact_count:Number(counts[String(g.group_id)] || 0)
    }));
}

function adminCreateGroup_(token, payload) {
  const auth = requireAdminSession_(token);
  payload = payload || {};
  const org = requireGroupTargetOrg_(auth.session, payload.org_id);
  const name = sanitizeText_(payload.group_name || '', 200);
  if (!name) throw new Error('Tên Ban/Nhóm không được trống.');
  assertUniqueGroupName_(org.org_id, name, '');

  const group = {
    group_id:randomId_('GRP'),
    org_id:String(org.org_id),
    group_type:normalizeGroupTypeForOrg_(org, payload.group_type),
    group_name:name,
    normalized_name:normalizeText_(name),
    sort_order:normalizeSortOrder_(payload.sort_order,999),
    status:'ACTIVE',
    source_sheet:'WEB_APP_ADMIN',
    source_row:'',
    created_at:nowIso_(),
    updated_at:nowIso_()
  };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    appendObject_(CONFIG.SHEETS.GROUPS, group);
    audit_(auth.session.username,'CREATE_GROUP','GROUP',group.group_id,null,group,'PASS');
    invalidatePublicDirectoryCache_();
    return group;
  } finally {
    lock.releaseLock();
  }
}

function adminUpdateGroup_(token, payload) {
  const auth = requireAdminSession_(token);
  payload = payload || {};
  const current = findBy_(CONFIG.SHEETS.GROUPS,'group_id',payload.group_id);
  if (!current) throw new Error('Không tìm thấy Ban/Nhóm.');
  requireOrgWrite_(auth.session,current.org_id);

  if (payload.org_id && String(payload.org_id) !== String(current.org_id)) {
    throw new Error('Không đổi đơn vị chủ quản trực tiếp. Hãy tạo nhóm mới và chuyển cán bộ nếu cần.');
  }

  const org = requireGroupTargetOrg_(auth.session,current.org_id);
  const name = sanitizeText_(payload.group_name != null ? payload.group_name : current.group_name,200);
  if (!name) throw new Error('Tên Ban/Nhóm không được trống.');
  assertUniqueGroupName_(current.org_id,name,current.group_id);

  const patch = {
    group_name:name,
    normalized_name:normalizeText_(name),
    group_type:normalizeGroupTypeForOrg_(org,payload.group_type != null ? payload.group_type : current.group_type),
    sort_order:normalizeSortOrder_(payload.sort_order,current.sort_order || 999),
    updated_at:nowIso_()
  };
  const before = {
    group_name:current.group_name,
    group_type:current.group_type,
    sort_order:current.sort_order
  };

  const updated = updateByHeaders_(CONFIG.SHEETS.GROUPS,current._row,patch);
  audit_(auth.session.username,'UPDATE_GROUP','GROUP',current.group_id,before,patch,'PASS');
  invalidatePublicDirectoryCache_();
  return updated;
}

function adminSetGroupStatus_(token, groupId, status) {
  const auth = requireAdminSession_(token);
  const current = findBy_(CONFIG.SHEETS.GROUPS,'group_id',groupId);
  if (!current) throw new Error('Không tìm thấy Ban/Nhóm.');
  requireOrgWrite_(auth.session,current.org_id);

  const next = normalizeOrganizationStatus_(status);
  if (next === 'INACTIVE') {
    const activeContacts = tableObjects_(CONFIG.SHEETS.CONTACTS).filter(c =>
      String(c.group_id) === String(groupId) && String(c.status) === 'ACTIVE'
    );
    if (activeContacts.length) {
      throw new Error('Ban/Nhóm đang có ' + activeContacts.length + ' cán bộ hoạt động. Hãy chuyển hoặc gỡ nhóm khỏi cán bộ trước.');
    }
  }

  const before = {status:current.status};
  const updated = updateByHeaders_(CONFIG.SHEETS.GROUPS,current._row,{
    status:next,
    updated_at:nowIso_()
  });
  audit_(auth.session.username,'SET_GROUP_STATUS','GROUP',current.group_id,before,{status:next},'PASS');
  invalidatePublicDirectoryCache_();
  return updated;
}
