function commitImportContactsPhase4_(token, targetOrgId, rows) {
  const auth = requireAdminSession_(token);
  if (!isProvinceAdmin_(auth.session) && reviewMode_() === 'REQUIRED') {
    throw new Error('Đang bật chế độ duyệt bắt buộc. Import hàng loạt chỉ Admin cấp tỉnh được commit.');
  }
  return commitImportContacts_(token,targetOrgId,rows);
}
