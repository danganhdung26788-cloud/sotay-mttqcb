# Deployment

## Đã chuẩn bị
- Source V1.1 hợp nhất.
- `appsscript.json`.
- CI validate.
- Workflow deploy bằng `@google/clasp` 3.4.1.
- Không lưu credential trong repo.

## Thao tác người dùng một lần
1. Tạo **private GitHub repo** mới, đề xuất `danh-ba-mttq-cao-bang`.
2. Cấp GitHub connector quyền push vào repo đó.
3. Bật Apps Script API tại Apps Script user settings.
4. Tạo Apps Script project mới và lấy `scriptId`.
5. Trên máy tin cậy: cài clasp 3.4.1, chạy `clasp login`.
6. Tạo GitHub Secrets:
   - `CLASPRC_JSON`: nội dung `~/.clasprc.json`.
   - `CLASP_JSON`: `{"scriptId":"...","rootDir":"src"}`.
7. Chạy workflow **Deploy Apps Script** để push source.
8. Trong Apps Script UI chạy `setupDatabase()`.
9. Chạy `provisionAllAdminPasswords(...)`; mật khẩu được nhập trực tiếp, không commit.
10. Chạy `runPhase4RegressionTests()`.
11. Tạo Web App deployment đầu tiên trong Apps Script UI.
12. Lưu deployment ID vào secret `CLASP_DEPLOYMENT_ID`.
13. Từ đó workflow có thể cập nhật deployment hiện có.

## Gate production
- Regression PASS.
- Test `admin.caobang` + ít nhất 2 Admin xã.
- Cross-scope phải DENIED.
- Avatar PASS.
- Backup thật PASS.
- Restore chỉ thử trên clone trước production.
