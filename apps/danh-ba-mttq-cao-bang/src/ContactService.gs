function searchContacts(token, query, orgId) {
  const session = requireSession_(token);
  const q = normalizeText_(query);
  let rows = tableObjects_(CONFIG.SHEETS.CONTACTS).filter(x => String(x.status) === 'ACTIVE');
  if (orgId) {
    if (!canManageOrg_(session, orgId) && session.role_id !== 'VIEWER' &&
        session.role_id !== 'PROVINCIAL_ADMIN' && session.role_id !== 'SUPER_ADMIN') {
      throw new Error('Không có quyền xem phạm vi này.');
    }
    rows = rows.filter(x => String(x.org_id) === String(orgId));
  } else if (session.role_id === 'UNIT_ADMIN' || session.role_id === 'EDITOR') {
    rows = rows.filter(x => canManageOrg_(session, x.org_id));
  }
  if (q) {
    rows = rows.filter(x =>
      normalizeText_(x.full_name).includes(q) ||
      normalizeText_(x.position).includes(q) ||
      normalizePhone_(x.phone).includes(normalizePhone_(query))
    );
  }
  return rows.slice(0, 500);
}


function createContact(token, payload) {
  const session = requireSession_(token);
  requireOrgWrite_(session, payload.org_id);
  const fullName = String(payload.full_name || '').trim();
  if (!fullName) throw new Error('Họ và tên không được trống.');
  const phone = normalizePhone_(payload.phone);
  const contact = {
    contact_id: randomId_('CT'),
    org_id: payload.org_id,
    group_id: payload.group_id || '',
    full_name: fullName,
    normalized_name: normalizeText_(fullName),
    position: String(payload.position || '').trim(),
    phone: phone,
    phone_normalized: phone,
    email: String(payload.email || '').trim(),
    zalo: phone,
    avatar_file_id: payload.avatar_file_id || '',
    sort_order: Number(payload.sort_order || 999),
    status: 'ACTIVE',
    public_flag: payload.public_flag !== false,
    source_sheet: 'WEB_APP',
    source_row: '',
    data_quality: phone ? 'PASS' : 'REVIEW',
    review_reason: phone ? '' : 'MISSING_PHONE',
    created_at: nowIso_(),
    updated_at: nowIso_()
  };
  appendObject_(CONFIG.SHEETS.CONTACTS, contact);
  audit_(session.username, 'CREATE_CONTACT', 'CONTACT', contact.contact_id, null, contact, 'PASS');
  return contact;
}
