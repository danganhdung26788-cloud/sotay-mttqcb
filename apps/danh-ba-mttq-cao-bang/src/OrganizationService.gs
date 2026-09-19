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
  requireOrgWrite_(session, parentOrgId);
  const parent = findBy_(CONFIG.SHEETS.ORGANIZATIONS, 'org_id', parentOrgId);
  if (!parent || Number(parent.level) !== 2) throw new Error('Đơn vị cha phải là xã/phường.');
  if (session.role_id === 'UNIT_ADMIN' && String(parentOrgId) !== String(session.scope_org_id)) {
    throw new Error('Admin xã chỉ được tạo cấp 3 thuộc xã mình.');
  }
  const name = String(orgName || '').trim();
  if (!name) throw new Error('Tên thôn/xóm/tổ dân phố không được trống.');
  const org = {
    org_id: randomId_('ORG_L3'),
    parent_org_id: parentOrgId,
    level: 3,
    org_type: orgType || 'VILLAGE',
    org_name: name,
    short_name: name,
    normalized_name: normalizeText_(name),
    sort_order: tableObjects_(CONFIG.SHEETS.ORGANIZATIONS)
      .filter(o => String(o.parent_org_id) === String(parentOrgId)).length + 1,
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
  const before = {status: org.status};
  const updated = updateByHeaders_(CONFIG.SHEETS.ORGANIZATIONS, org._row, {
    status: status,
    updated_at: nowIso_()
  });
  audit_(session.username, 'SET_ORG_STATUS', 'ORGANIZATION', orgId, before, {status: updated.status}, 'PASS');
  return updated;
}
