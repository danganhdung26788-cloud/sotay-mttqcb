# Deployment

## Trạng thái

- Repository: `danganhdung26788-cloud/sotay-mttqcb`.
- Module: `apps/danh-ba-mttq-cao-bang/`.
- Deploy/runtime workflow: `.github/workflows/danh-ba-deploy.yml`.
- `@google/clasp`: 3.4.1.
- Google OAuth, `CLASPRC_JSON`, `CLASP_JSON`, source push, database baseline và Phase 4 regression đã PASS.
- Không lưu credential/token/mật khẩu trong repository.

## Cơ chế Phase 4A

Sau khi thay đổi được merge vào `main`, workflow tự thực hiện:

1. Validate source.
2. Nạp OAuth/clasp từ GitHub Secrets.
3. Sinh token runtime dùng một lần và chỉ đưa SHA-256 của token vào workspace tạm.
4. Push source kiểm thử lên Apps Script.
5. Tạo deployment kiểm thử tạm.
6. Tự gọi runtime gate để chạy:
   - `setupDatabase_()`
   - `verifyDatabase_()`
   - `runPhase4RegressionTests_()`
   - credential-state check.
7. Lưu evidence JSON trong GitHub Actions artifact.
8. Xóa deployment kiểm thử.
9. Khôi phục Apps Script HEAD về source sạch từ repository.
10. Nếu gate `PASS`, tự tìm deployment production hiện có theo marker `DANH_BA_PRODUCTION`; nếu chưa có thì tự tạo, nếu có thì tự cập nhật.
11. Smoke-test trang public và admin.

Không còn yêu cầu người dùng tự tạo Web App deployment đầu tiên hoặc copy `CLASP_DEPLOYMENT_ID` vào GitHub Secret.

## Trạng thái gate

- `PASS`: baseline/regression PASS và credential đã sẵn sàng; pipeline được phép tạo/cập nhật production deployment.
- `REVIEW`: baseline PASS nhưng credential còn `PENDING_PROVISION` hoặc hash trống; pipeline không thay production.
- `BLOCKED`: baseline/regression/runtime gate lỗi; pipeline dừng fail-closed.

## Việc vẫn cần acceptance trước RUNTIME PASS

- Public directory thực tế.
- Province admin + ít nhất 02 UNIT_ADMIN.
- Cross-scope read/write DENIED.
- Level-3 hierarchy.
- Contact CRUD.
- Password/session invalidation.
- Avatar security.
- Review OPTIONAL/REQUIRED + stale approval.
- Backup + BACKUP_LOG.
- Restore preview source không đăng ký phải DENIED.
- Restore chỉ trên clone/test DB.

Chỉ sau khi toàn bộ acceptance trên PASS mới cập nhật `SOURCE_STATUS.md` thành **RUNTIME PASS**.
