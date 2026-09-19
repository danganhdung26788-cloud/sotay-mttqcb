function backupLog_(actor, mode, backupFile, result, note) {
  appendObject_(CONFIG.SHEETS.BACKUP_LOG,{
    backup_id:randomId_('BKP'),
    timestamp:nowIso_(),
    actor:actor || 'SYSTEM',
    mode:mode || 'MANUAL',
    source_db_id:CONFIG.DB_ID,
    backup_file_id:backupFile ? backupFile.getId() : '',
    backup_url:backupFile ? backupFile.getUrl() : '',
    result:result || 'PASS',
    note:sanitizeText_(note,500)
  });
}

function createDatabaseBackupInternal_(actor, note, mode) {
  const rootId = setting_('BACKUP_ROOT_FOLDER_ID','');
  if (!rootId) throw new Error('Chưa cấu hình thư mục backup.');

  const root = DriveApp.getFolderById(rootId);
  const stamp = Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyyMMdd_HHmmss');
  const folder = root.createFolder('DB_BACKUP_' + stamp);
  const src = DriveApp.getFileById(CONFIG.DB_ID);
  const copy = src.makeCopy('DATABASE_DANH_BA_MTTQ_' + stamp,folder);

  backupLog_(actor,mode || 'MANUAL',copy,'PASS',note || '');
  return {ok:true,file_id:copy.getId(),url:copy.getUrl(),folder_id:folder.getId()};
}

function adminCreateDatabaseBackup(token, note) {
  const auth = requireAdminSession_(token);
  requireProvinceAdmin_(auth.session);
  const out = createDatabaseBackupInternal_(auth.session.username,note,'MANUAL');
  audit_(auth.session.username,'CREATE_DATABASE_BACKUP','DATABASE',out.file_id,null,{url:out.url},'PASS');
  return out;
}

function normalizeBackupListLimit_(limit) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(Math.floor(n),200);
}

function adminListBackups(token, limit) {
  const auth = requireAdminSession_(token);
  requireProvinceAdmin_(auth.session);
  return tableObjects_(CONFIG.SHEETS.BACKUP_LOG)
    .sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0,normalizeBackupListLimit_(limit))
    .map(r => ({
      backup_id:String(r.backup_id),
      timestamp:String(r.timestamp),
      actor:String(r.actor),
      mode:String(r.mode),
      backup_file_id:String(r.backup_file_id),
      backup_url:String(r.backup_url),
      result:String(r.result),
      note:String(r.note || '')
    }));
}

function registeredBackup_(backupFileId) {
  const id = String(backupFileId || '').trim();
  if (!id) throw new Error('Thiếu file backup.');

  const row = tableObjects_(CONFIG.SHEETS.BACKUP_LOG).find(r =>
    String(r.backup_file_id || '') === id &&
    String(r.source_db_id || '') === String(CONFIG.DB_ID) &&
    String(r.result || '') === 'PASS'
  );

  if (!row) throw new Error('File không thuộc danh sách backup hợp lệ của hệ thống.');
  return row;
}

function sheetDataRowCountByKey_(sh) {
  if (!sh || sh.getMaxRows() <= 1) return 0;
  const keys = sh.getRange(2,1,sh.getMaxRows()-1,1).getDisplayValues();
  let count = 0;
  keys.forEach(r => {
    if (String(r[0] || '').trim() !== '') count++;
  });
  return count;
}

function adminPreviewRestore(token, backupFileId) {
  const auth = requireAdminSession_(token);
  requireProvinceAdmin_(auth.session);
  const backup = registeredBackup_(backupFileId);

  let ss;
  try {
    ss = SpreadsheetApp.openById(String(backupFileId));
  } catch (e) {
    throw new Error('Không mở được file backup đã đăng ký.');
  }

  const managed = [
    CONFIG.SHEETS.ORGANIZATIONS,
    CONFIG.SHEETS.GROUPS,
    CONFIG.SHEETS.CONTACTS,
    CONFIG.SHEETS.ROLES,
    CONFIG.SHEETS.SETTINGS,
    CONFIG.SHEETS.IMPORT,
    CONFIG.SHEETS.REVIEW,
    CONFIG.SHEETS.REVIEW_REQUESTS
  ];

  const detail = managed.map(name => {
    const sh = ss.getSheetByName(name);
    return {
      sheet:name,
      exists:!!sh,
      rows:sh ? sheetDataRowCountByKey_(sh) : 0
    };
  });

  return {
    ok:detail.every(x => x.exists),
    backup_id:String(backup.backup_id || ''),
    title:ss.getName(),
    sheets:detail
  };
}

function copySheetValues_(sourceSs, targetSs, name) {
  const src = sourceSs.getSheetByName(name);
  const dst = targetSs.getSheetByName(name);
  if (!src || !dst) throw new Error('Thiếu sheet khi restore: ' + name);

  const keyValues = src.getRange(1,1,src.getMaxRows(),1).getDisplayValues();
  let lastRow = 1;
  for (let i=keyValues.length-1;i>=0;i--) {
    if (String(keyValues[i][0] || '').trim() !== '') {
      lastRow=i+1;
      break;
    }
  }

  const lastCol = Math.max(src.getLastColumn(),1);
  const values = src.getRange(1,1,lastRow,lastCol).getValues();

  dst.clearContents();
  if (dst.getMaxRows() < values.length) {
    dst.insertRowsAfter(dst.getMaxRows(),values.length-dst.getMaxRows());
  }
  if (dst.getMaxColumns() < values[0].length) {
    dst.insertColumnsAfter(dst.getMaxColumns(),values[0].length-dst.getMaxColumns());
  }
  dst.getRange(1,1,values.length,values[0].length).setValues(values);
}

function adminRestoreOperationalData(token, backupFileId, confirmation) {
  const auth = requireAdminSession_(token);
  requireProvinceAdmin_(auth.session);

  if (String(confirmation) !== 'RESTORE_OPERATIONAL_DATA') {
    throw new Error('Thiếu xác nhận restore.');
  }

  registeredBackup_(backupFileId);
  const preview = adminPreviewRestore(token,backupFileId);
  if (!preview.ok) throw new Error('Backup không đủ schema để restore.');

  return withScriptLock_(30000, () => {
    const safety = createDatabaseBackupInternal_(
      auth.session.username,
      'Auto snapshot before restore',
      'PRE_RESTORE'
    );

    const src = SpreadsheetApp.openById(String(backupFileId));
    const dst = db_();

    [
      CONFIG.SHEETS.ORGANIZATIONS,
      CONFIG.SHEETS.GROUPS,
      CONFIG.SHEETS.CONTACTS,
      CONFIG.SHEETS.ROLES,
      CONFIG.SHEETS.SETTINGS,
      CONFIG.SHEETS.IMPORT,
      CONFIG.SHEETS.REVIEW,
      CONFIG.SHEETS.REVIEW_REQUESTS
    ].forEach(name => copySheetValues_(src,dst,name));

    invalidateSettingsCache_();
    invalidatePublicDirectoryCache_();

    audit_(
      auth.session.username,
      'RESTORE_OPERATIONAL_DATA',
      'DATABASE',
      String(backupFileId),
      null,
      {safety_backup_file_id:safety.file_id},
      'PASS'
    );

    return {
      ok:true,
      safety_backup:safety,
      restored_from:String(backupFileId)
    };
  });
}
