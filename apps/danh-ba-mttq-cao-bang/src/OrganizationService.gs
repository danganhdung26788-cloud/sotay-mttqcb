function normalizeLevel3Type_(value) {
  const type = String(value || 'VILLAGE').toUpperCase();
  if (!['VILLAGE','RESIDENTIAL_GROUP'].includes(type)) {
    throw new Error('Loại đơn vị cấp 3 không hợp lệ.');
  }
  return type;
}

function normalizeOrganizationStatus_(value) {
  const status = String(value || 'ACTIVE').toUpperCase();
  if (!['ACTIVE','INACTIVE'].includes(status)) {
    throw new Error('Trạng thái đơn vị không hợp lệ.');
  }
  return status;
}

function normalizeSortOrder_(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return Number(fallback || 999);
  return Math.min(Math.floor(n), 999999);
}

function requireLevel2Parent_(session, parentOrgId) {
  requireOrgWrite_(session, parentOrgId);
  const parent = findBy_(CONFIG.SHEETS.ORGANIZATIONS, 'org_id', parentOrgId);
  if (!parent || Number(parent.level) !== 2) throw new Error('Đơn vị cha phải là xã/phường.');
  if (String(parent.status) !== 'ACTIVE') throw new Error('Xã/phường cha đang ngừng sử dụng.');
  if (session.role_id === 'UNIT_ADMIN' && String(parentOrgId) !== String(session.scope_org_id)) {
    throw new Error('Admin xã chỉ được thao tác cấp 3 thuộc xã mình.');
  }
  return parent;
}

function assertUniqueLevel3Name_(parentOrgId, orgName, excludeOrgId) {
  const normalized = normalizeText_(orgName);
  const duplicate = tableObjects_(CONFIG.SHEETS.ORGANIZATIONS).find(o =>
    Number(o.level) === 3 &&
    String(o.parent_org_id) === String(parentOrgId) &&
    String(o.org_id) !== String(excludeOrgId || '') &&
    normalizeText_(o.org_name) === normalized &&
    String(o.status) === 'ACTIVE'
  );
  if (duplicate) throw new Error('Đơn vị cấp 3 cùng tên đã tồn tại trong xã/phường này.');
}

function getOrganizationTree(token) {
  const session = requireSession_(token);
  const orgs = tableObjects_(CONFIG.SHEETS.ORGANIZATIONS).filter(o => String(o.status) === 'ACTIVE');
  const visible = (session.role_id === 'UNIT_ADMIN' || session.role_id === 'EDITOR')
    ? orgs.filter(o => String(o.org_id) === String(session.scope_org_id) ||
                       String(o.parent_org_id) === String(session.scope_org_id))
    : orgs;
  return visible.sort((a,b) => Number(a.level)-Number(b.level) || Number(a.sort_order)-Number(b.sort_order));
}

function createLevel3Organization(token, parentOrgId, orgName, orgType) {
  const session = requireSession_(token);
  requireLevel2Parent_(session, parentOrgId);

  const name = sanitizeText_(orgName, 200);
  if (!name) throw new Error('Tên thôn/xóm/tổ dân phố không được trống.');
  assertUniqueLevel3Name_(parentOrgId, name, '');

  const siblings = tableObjects_(CONFIG.SHEETS.ORGANIZATIONS)
    .filter(o => String(o.parent_org_id) === String(parentOrgId) && Number(o.level) === 3);
  const maxOrder = siblings.reduce((m,o) => Math.max(m, normalizeSortOrder_(o.sort_order, 0)), 0);

  const org = {
    org_id: randomId_('ORG_L3'),
    parent_org_id: String(parentOrgId),
    level: 3,
    org_type: normalizeLevel3Type_(orgType),
    org_name: name,
    short_name: name,
    normalized_name: normalizeText_(name),
    sort_order: maxOrder + 1,
    status: 'ACTIVE',
    admin_username: '',
    created_at: nowIso_(),
    updated_at: nowIso_(),
    note: 'Cấp 3 do Admin xã/phường tạo'
  };
  appendObject_(CONFIG.SHEETS.ORGANIZATIONS, org);
  audit_(session.username, 'CREATE_LEVEL3_ORG', 'ORGANIZATION', org.org_id, null, org, 'PASS');
  return org;
}

function setOrganizationStatus(token, orgId, status) {
  const session = requireSession_(token);
  requireOrgWrite_(session, orgId);
  const org = findBy_(CONFIG.SHEETS.ORGANIZATIONS, 'org_id', orgId);
  if (!org) throw new Error('Không tìm thấy đơn vị.');
  if (Number(org.level) < 3 && session.role_id === 'UNIT_ADMIN') {
    throw new Error('Admin xã không được ngừng sử dụng đơn vị cấp trên.');
  }
  const nextStatus = normalizeOrganizationStatus_(status);
  const before = {status: org.status};
  const updated = updateByHeaders_(CONFIG.SHEETS.ORGANIZATIONS, org._row, {
    status: nextStatus,
    updated_at: nowIso_()
  });
  audit_(session.username, 'SET_ORG_STATUS', 'ORGANIZATION', orgId, before, {status: updated.status}, 'PASS');
  return updated;
}
