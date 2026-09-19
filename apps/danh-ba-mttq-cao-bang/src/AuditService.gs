function audit_(actor, action, entityType, entityId, beforeObj, afterObj, result) {
  appendObject_(CONFIG.SHEETS.AUDIT, {
    log_id: randomId_('AUD'),
    timestamp: nowIso_(),
    actor: actor || 'SYSTEM',
    action: action,
    entity_type: entityType || '',
    entity_id: entityId || '',
    before_json: beforeObj ? JSON.stringify(beforeObj) : '',
    after_json: afterObj ? JSON.stringify(afterObj) : '',
    result: result || 'PASS'
  });
}
