function listAdminAudit(token, limit) {
  const auth=requireAdminSession_(token);
  limit=Math.min(Math.max(Number(limit||100),1),500);
  let rows=tableObjects_(CONFIG.SHEETS.AUDIT);
  if(!isProvinceAdmin_(auth.session)){
    rows=rows.filter(a=>String(a.actor)===String(auth.session.username));
  }
  return rows.slice(-limit).reverse().map(a=>({
    timestamp:String(a.timestamp||''),actor:String(a.actor||''),action:String(a.action||''),
    entity_type:String(a.entity_type||''),entity_id:String(a.entity_id||''),result:String(a.result||'')
  }));
}
