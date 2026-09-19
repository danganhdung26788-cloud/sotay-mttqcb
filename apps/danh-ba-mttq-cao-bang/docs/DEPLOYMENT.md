# Deployment

## Trạng thái GitHub
- Repository: `danganhdung26788-cloud/sotay-mttqcb`.
- Module: `apps/danh-ba-mttq-cao-bang/`.
- Source V1.1 Phase 4 đã import và validate thành công.
- Root workflow CI: `.github/workflows/danh-ba-ci.yml`.
- Root workflow deploy: `.github/workflows/danh-ba-deploy.yml`.
- Deploy dùng `@google/clasp` 3.4.1.
- Không lưu credential/token/mật khẩu trong repo.

## Phần người dùng cần cấp quyền một lần
1. Bật **Google Apps Script API** tại Apps Script user settings.
2. Tạo một **standalone Apps Script project** cho Danh bạ MTTQ Cao Bằng.
3. Mở Project Settings và lấy `scriptId`.
4. Trên thiết bị tin cậy, cài `@google/clasp@3.4.1` và chạy `clasp login`.
5. Trong GitHub repository settings, tạo Actions Secrets:
   - `CLASPRC_JSON`: nội dung credential do `clasp login` tạo.
   - `CLASP_JSON`: `{"scriptId":"SCRIPT_ID_THAT","rootDir":"src"}`.
6. Chạy workflow **Danh ba MTTQ - Deploy Apps Script** trên branch `main`.
7. Khi Google yêu cầu quyền lần đầu, xác nhận quyền Sheets/Drive cho Apps Script project.
8. Trong Apps Script UI chạy `setupDatabase()` và xác nhận baseline.
9. Nhập mật khẩu khởi tạo trực tiếp khi chạy `provisionAllAdminPasswords(...)`; không commit mật khẩu.
10. Chạy `runPhase4RegressionTests()`.
11. Tạo Web App deployment đầu tiên trong Apps Script UI, chọn phạm vi truy cập phù hợp.
12. Lưu deployment ID vào GitHub secret `CLASP_DEPLOYMENT_ID`.
13. Các lần sau workflow có thể cập nhật deployment hiện có bằng `clasp create-deployment --deploymentId ...`.

## Gate production
- `runPhase4RegressionTests().ok === true`.
- Test `admin.caobang` + ít nhất 02 Admin xã.
- Mutation chéo scope phải DENIED.
- Avatar PASS.
- Review workflow PASS.
- Backup thật PASS.
- Restore chỉ test trên clone trước production.
- Không có lỗi Critical/High còn mở.
