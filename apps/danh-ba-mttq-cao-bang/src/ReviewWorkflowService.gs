function reviewMode_() {
  const mode = String(setting_('UNIT_ADMIN_REVIEW_MODE','OPTIONAL')).toUpperCase();
  return mode === 'REQUIRED' ? 'REQUIRED' : 'OPTIONAL';
}

function reviewAction_(value) {
  const action = String(value || '').toUpperCase();
  if (!['CREATE_CONTACT','UPDATE_CONTACT','SET_CONTACT_STATUS'].includes(action)) {
    throw new Error('Nghiệp vụ duyệt không hợp lệ.');
  }
  return action;
}

function queueReviewRequest_(auth, orgId, entityType, entityId, action, payload) {
  requireOrgWrite_(auth.session,orgId);
  const safeAction = reviewAction_(action);
  const row = {
    request_id:randomId_('RQR'),
    timestamp:nowIso_(),
    actor:String(auth.session.username),
    org_id:String(orgId),
    entity_type:String(entityType),
    entity_id:String(entityId || ''),
    action:safeAction,
    payload_json:JSON.stringify(redactSecrets_(payload || {})),
    status:'PENDING',
    reviewer:'',
    reviewed_at:'',
    review_note:''
  };
  appendObject_(CONFIG.SHEETS.REVIEW_REQUESTS,row);
  audit_(
    auth.session.username,
    'SUBMIT_REVIEW_REQUEST',
    'REVIEW_REQUEST',
    row.request_id,
    null,
    {org_id:orgId,entity_type:entityType,entity_id:entityId,action:safeAction},
    'PASS'
  );
  return {ok:true,queued:true,request:row};
}

function adminSaveContactPhase4(token, payload) {
  const auth = requireAdminSession_(token);
  payload = payload || {};
  const current = payload.contact_id
    ? findBy_(CONFIG.SHEETS.CONTACTS,'contact_id',payload.contact_id)
    : null;

  if (payload.contact_id && !current) throw new Error('Không tìm thấy cán bộ.');
  if (current) requireOrgWrite_(auth.session,current.org_id);

  const orgId = String(payload.org_id || (current && current.org_id) || '');
  requireOrgWrite_(auth.session,orgId);

  const needReview = !isProvinceAdmin_(auth.session) &&
    (reviewMode_() === 'REQUIRED' || payload.submit_for_review === true);

  if (needReview) {
    const reviewPayload = Object.assign({}, payload);
    delete reviewPayload.submit_for_review;
    if (current) reviewPayload.__base_updated_at = String(current.updated_at || '');
    return queueReviewRequest_(
      auth,
      orgId,
      'CONTACT',
      payload.contact_id || '',
      payload.contact_id ? 'UPDATE_CONTACT' : 'CREATE_CONTACT',
      reviewPayload
    );
  }

  return payload.contact_id ? adminUpdateContact(token,payload) : adminCreateContact(token,payload);
}

function adminSetContactStatusPhase4(token, contactId, status, submitForReview) {
  const auth = requireAdminSession_(token);
  const c = findBy_(CONFIG.SHEETS.CONTACTS,'contact_id',contactId);
  if (!c) throw new Error('Không tìm thấy cán bộ.');
  requireOrgWrite_(auth.session,c.org_id);

  const nextStatus = String(status || '').toUpperCase();
  if (!['ACTIVE','INACTIVE'].includes(nextStatus)) throw new Error('Trạng thái không hợp lệ.');

  const needReview = !isProvinceAdmin_(auth.session) &&
    (reviewMode_() === 'REQUIRED' || submitForReview === true);

  if (needReview) {
    return queueReviewRequest_(
      auth,
      c.org_id,
      'CONTACT',
      contactId,
      'SET_CONTACT_STATUS',
      {
        contact_id:contactId,
        status:nextStatus,
        __base_updated_at:String(c.updated_at || '')
      }
    );
  }

  return adminSetContactStatus(token,contactId,nextStatus);
}

function listReviewRequests(token, status) {
  const auth = requireAdminSession_(token);
  const allowed = scopedOrgIds_(auth.session);
  let rows = tableObjects_(CONFIG.SHEETS.REVIEW_REQUESTS);

  if (!isProvinceAdmin_(auth.session)) {
    rows = rows.filter(r => allowed.has(String(r.org_id)));
  }

  if (status) {
    const allowedStatus = ['PENDING','PROCESSING','APPROVED','REJECTED','ERROR'];
    const normalized = String(status).toUpperCase();
    if (!allowedStatus.includes(normalized)) throw new Error('Trạng thái duyệt không hợp lệ.');
    rows = rows.filter(r => String(r.status) === normalized);
  }

  return rows
    .sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0,500)
    .map(r => ({
      request_id:String(r.request_id),
      timestamp:String(r.timestamp),
      actor:String(r.actor),
      org_id:String(r.org_id),
      entity_type:String(r.entity_type),
      entity_id:String(r.entity_id || ''),
      action:String(r.action),
      payload_json:String(r.payload_json || ''),
      status:String(r.status),
      reviewer:String(r.reviewer || ''),
      reviewed_at:String(r.reviewed_at || ''),
      review_note:String(r.review_note || '')
    }));
}

function assertReviewFresh_(req, payload) {
  if (!req.entity_id || !payload.__base_updated_at) return;
  const current = findBy_(CONFIG.SHEETS.CONTACTS,'contact_id',req.entity_id);
  if (!current) throw new Error('Hồ sơ gốc không còn tồn tại.');
  if (String(current.updated_at || '') !== String(payload.__base_updated_at || '')) {
    throw new Error('Hồ sơ đã thay đổi sau khi gửi duyệt. Cần tạo yêu cầu duyệt mới.');
  }
}

function adminReviewRequest(token, requestId, decision, note) {
  const auth = requireAdminSession_(token);
  requireProvinceAdmin_(auth.session);

  decision = String(decision || '').toUpperCase();
  if (!['APPROVE','REJECT'].includes(decision)) {
    throw new Error('Quyết định duyệt không hợp lệ.');
  }

  const cleanNote = sanitizeText_(note,500);
  if (decision === 'REJECT' && !cleanNote) {
    throw new Error('Cần nhập lý do từ chối.');
  }

  let req = null;
  withScriptLock_(30000, () => {
    req = findBy_(CONFIG.SHEETS.REVIEW_REQUESTS,'request_id',requestId);
    if (!req) throw new Error('Không tìm thấy yêu cầu duyệt.');
    if (String(req.status) !== 'PENDING') throw new Error('Yêu cầu này đã được xử lý.');
    updateByHeaders_(CONFIG.SHEETS.REVIEW_REQUESTS,req._row,{
      status:'PROCESSING',
      reviewer:String(auth.session.username),
      reviewed_at:nowIso_()
    });
  });

  if (decision === 'REJECT') {
    const patch={
      status:'REJECTED',
      reviewer:String(auth.session.username),
      reviewed_at:nowIso_(),
      review_note:cleanNote
    };
    updateByHeaders_(CONFIG.SHEETS.REVIEW_REQUESTS,req._row,patch);
    audit_(
      auth.session.username,
      'REJECT_REVIEW_REQUEST',
      'REVIEW_REQUEST',
      requestId,
      {status:'PENDING'},
      patch,
      'PASS'
    );
    return {ok:true,status:'REJECTED',applied:null};
  }

  try {
    const payload = req.payload_json ? JSON.parse(String(req.payload_json)) : {};
    assertReviewFresh_(req,payload);

    let applied = null;
    if (String(req.action) === 'CREATE_CONTACT') {
      applied = adminCreateContact(token,payload);
    } else if (String(req.action) === 'UPDATE_CONTACT') {
      applied = adminUpdateContact(token,payload);
    } else if (String(req.action) === 'SET_CONTACT_STATUS') {
      applied = adminSetContactStatus(token,payload.contact_id || req.entity_id,payload.status);
    } else {
      throw new Error('Action review chưa được hỗ trợ: ' + req.action);
    }

    const patch={
      status:'APPROVED',
      reviewer:String(auth.session.username),
      reviewed_at:nowIso_(),
      review_note:cleanNote
    };
    if (applied && applied.contact_id && !req.entity_id) {
      patch.entity_id=String(applied.contact_id);
    }

    updateByHeaders_(CONFIG.SHEETS.REVIEW_REQUESTS,req._row,patch);
    audit_(
      auth.session.username,
      'APPROVE_REVIEW_REQUEST',
      'REVIEW_REQUEST',
      requestId,
      {status:'PENDING'},
      patch,
      'PASS'
    );
    return {ok:true,status:'APPROVED',applied:applied};
  } catch (e) {
    const errorNote = sanitizeText_(e.message || e,500);
    updateByHeaders_(CONFIG.SHEETS.REVIEW_REQUESTS,req._row,{
      status:'ERROR',
      reviewer:String(auth.session.username),
      reviewed_at:nowIso_(),
      review_note:errorNote
    });
    audit_(
      auth.session.username,
      'APPROVE_REVIEW_REQUEST',
      'REVIEW_REQUEST',
      requestId,
      {status:'PENDING'},
      {status:'ERROR',review_note:errorNote},
      'FAIL'
    );
    throw e;
  }
}
