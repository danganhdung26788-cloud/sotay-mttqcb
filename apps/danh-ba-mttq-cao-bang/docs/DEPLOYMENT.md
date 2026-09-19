# Deployment

## Trạng thái GitHub
- Repository: `danganhdung26788-cloud/sotay-mttqcb`.
- Module: `apps/danh-ba-mttq-cao-bang/`.
- Source V1.1 Phase 4 đã import và GitHub CI PASS.
- Root workflow CI: `.github/workflows/danh-ba-ci.yml`.
- Root workflow deploy: `.github/workflows/danh-ba-deploy.yml`.
- Deploy dùng `@google/clasp` 3.4.1.
- `.claspignore` được kiểm tự động để bảo đảm `.gs`, `.html`, `appsscript.json` được push.
- Không lưu credential/token/mật khẩu trong repo.

## Cách ưu tiên trên Windows

Sau khi clone/download repo, chạy từ thư mục gốc repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\danh-ba-mttq-cao-bang\scripts\setup-google-auth.ps1
```

Helper sẽ:
1. Kiểm tra Node/npm và cài `@google/clasp@3.4.1`.
2. Mở Apps Script user settings để bật Apps Script API.
3. Mở trang tạo Apps Script project.
4. Yêu cầu dán `scriptId`.
5. Chạy `clasp login` để người dùng tự xác nhận OAuth.
6. Tạo local `.clasp.json` với `rootDir:"src"`.
7. Nếu máy có GitHub CLI `gh`, tự nạp `CLASPRC_JSON` và `CLASP_JSON` vào Actions Secrets mà không in token ra màn hình, sau đó kích workflow deploy.

Không gửi nội dung `~/.clasprc.json`, refresh token hoặc mật khẩu vào chat/commit.

## Cách thủ công nếu không dùng helper
1. Bật **Google Apps Script API** tại Apps Script user settings.
2. Tạo standalone Apps Script project **Danh bạ MTTQ tỉnh Cao Bằng**.
3. Mở Project Settings và lấy `scriptId`.
4. Trên thiết bị tin cậy, cài `@google/clasp@3.4.1` và chạy `clasp login`.
5. Tạo GitHub Actions Secrets:
   - `CLASPRC_JSON`: nội dung credential do `clasp login` tạo.
   - `CLASP_JSON`: `{"scriptId":"SCRIPT_ID_THAT","rootDir":"src"}`.
6. Chạy workflow **Danh ba MTTQ - Deploy Apps Script** trên branch `main`.

## Sau khi source được push vào Apps Script
1. Xác nhận quyền Sheets/Drive khi Google yêu cầu.
2. Chạy `setupDatabase()` và xác nhận baseline.
3. Nhập mật khẩu khởi tạo trực tiếp khi chạy `provisionAllAdminPasswords(...)`; không commit mật khẩu.
4. Chạy `runPhase4RegressionTests()`.
5. Tạo Web App deployment đầu tiên bằng Apps Script UI và tự chọn phạm vi truy cập phù hợp.
6. Lưu deployment ID vào GitHub secret `CLASP_DEPLOYMENT_ID`.
7. Các lần sau workflow cập nhật deployment hiện có bằng `clasp create-deployment --deploymentId ...`.

## Gate production
- `runPhase4RegressionTests().ok === true`.
- Test `admin.caobang` + ít nhất 02 Admin xã.
- Mutation chéo scope phải DENIED.
- Avatar PASS.
- Review workflow PASS.
- Backup thật PASS.
- Restore chỉ test trên clone trước production.
- Không có lỗi Critical/High còn mở.
