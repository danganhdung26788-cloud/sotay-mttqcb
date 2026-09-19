function normalizeImportRow_(row) {
  row = row || {};
  const flag = row.public_flag;
  return {
    full_name: String(row.full_name || row['Họ và tên'] || row['HỌ VÀ TÊN'] || '').trim(),
    position: String(row.position || row['Chức vụ'] || row['CHỨC VỤ'] || '').trim(),
    phone: normalizePhone_(row.phone || row['Số điện thoại'] || row['SỐ ĐIỆN THOẠI'] || ''),
    email: String(row.email || row['Email'] || row['EMAIL'] || '').trim(),
    public_flag: flag == null ? true : bool_(flag)
  };
}


function previewImportContacts(token, targetOrgId, rows) {
  const auth = requireAdminSession_(token);
  requireOrgWrite_(auth.session,targetOrgId);
  rows = Array.isArray(rows) ? rows : [];
  if (rows.length > 500) throw new Error('Mỗi lần import tối đa 500 dòng.');


  const existing = tableObjects_(CONFIG.SHEETS.CONTACTS)
    .filter(c => String(c.status) === 'ACTIVE');
  const phones = new Set(existing.map(c => normalizePhone_(c.phone)).filter(Boolean));


  return rows.map((raw,index) => {
    const r = normalizeImportRow_(raw);
    const issues=[];
    if (!r.full_name) issues.push('MISSING_NAME');
    if (!r.phone) issues.push('MISSING_PHONE');
    if (r.phone && r.phone.length !== 10) issues.push('PHONE_LENGTH');
    if (r.phone && phones.has(r.phone)) issues.push('DUPLICATE_PHONE');
    if (r.phone) phones.add(r.phone);
    return {row:index+1,data:r,issues:issues,accepted:!!r.full_name};
  });
}


function commitImportContacts(token, targetOrgId, rows) {
  const auth=requireAdminSession_(token);
  requireOrgWrite_(auth.session,targetOrgId);
  const preview=previewImportContacts(token,targetOrgId,rows);
  const accepted=preview.filter(x=>x.accepted);
  if (!accepted.length) throw new Error('Không có dòng hợp lệ để import.');


  const batchId=randomId_('IMP');
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    let pass=0,review=0;
    accepted.forEach(item=>{
      const r=item.data;
      const issues=item.issues;
      const id=randomId_('CT');
      appendObject_(CONFIG.SHEETS.CONTACTS,{
        contact_id:id,org_id:targetOrgId,group_id:'',
        full_name:r.full_name,normalized_name:normalizeText_(r.full_name),
        position:r.position,phone:r.phone,phone_normalized:r.phone,
        email:r.email,zalo:r.phone,avatar_file_id:'',sort_order:999,
        status:'ACTIVE',public_flag:r.public_flag,
        source_sheet:'ADMIN_IMPORT',source_row:item.row,
        data_quality:issues.length?'REVIEW':'PASS',
        review_reason:issues.join('; '),created_at:nowIso_(),updated_at:nowIso_()
      });
      issues.length?review++:pass++;
    });
    appendObject_(CONFIG.SHEETS.IMPORT,{
      batch_id:batchId,timestamp:nowIso_(),source_name:'ADMIN_IMPORT',
      mode:'APPEND',total_rows:accepted.length,pass_rows:pass,review_rows:review,
      result:review?'PASS_WITH_REVIEW':'PASS',
      note:'Import qua Admin Portal; không tự loại bỏ hồ sơ REVIEW'
    });
    audit_(auth.session.username,'IMPORT_CONTACTS','IMPORT',batchId,null,
      {org_id:targetOrgId,total:accepted.length,pass:pass,review:review},'PASS');
    invalidatePublicDirectoryCache_();
    return {ok:true,batch_id:batchId,total:accepted.length,pass:pass,review:review};
  }finally{
    lock.releaseLock();
  }
}


function csvEscape_(value) {
  const s=String(value==null?'':value);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}


function exportContactsCsv(token, orgId) {
  const auth=requireAdminSession_(token);
  const allowed=scopedOrgIds_(auth.session);
  if (orgId && !allowed.has(String(orgId))) throw new Error('Không có quyền xuất đơn vị này.');
  let rows=tableObjects_(CONFIG.SHEETS.CONTACTS).filter(c=>allowed.has(String(c.org_id)));
  if(orgId) rows=rows.filter(c=>String(c.org_id)===String(orgId));
  const orgMap=Object.fromEntries(tableObjects_(CONFIG.SHEETS.ORGANIZATIONS).map(o=>[String(o.org_id),String(o.org_name)]));
  const head=['Họ và tên','Chức vụ','Số điện thoại','Email','Đơn vị','Trạng thái','Công khai'];
  const data=[head].concat(rows.map(c=>[
    c.full_name,c.position,c.phone,c.email,orgMap[String(c.org_id)]||'',c.status,bool_(c.public_flag)?'TRUE':'FALSE'
  ]));
  const csv='\uFEFF'+data.map(r=>r.map(csvEscape_).join(',')).join('\r\n');
  audit_(auth.session.username,'EXPORT_CONTACTS','CONTACT',orgId||'SCOPE',null,{rows:rows.length},'PASS');
  return {file_name:'danh_ba_mttq.csv',mime_type:'text/csv;charset=utf-8',content:csv};
}
