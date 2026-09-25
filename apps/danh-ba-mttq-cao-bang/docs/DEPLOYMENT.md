# Deployment

## Trạng thái

- Repository: `danganhdung26788-cloud/sotay-mttqcb`.
- Module: `apps/danh-ba-mttq-cao-bang/`.
- Deploy/runtime workflow: `.github/workflows/danh-ba-deploy.yml`.
- `@google/clasp`: 3.4.1.
- Google OAuth, `CLASPRC_JSON`, `CLASP_JSON`, source push, database baseline và Phase 4 regression đã PASS.
- Không lưu credential/token/mật khẩu trong repository hoặc GitHub log.

## Cơ chế Phase 4A/4B

Sau khi thay đổi được merge vào `main`, workflow tự thực hiện:

1. Validate source.
2. Nạp OAuth/clasp từ GitHub Secrets.
3. Sinh token runtime dùng một lần và chỉ đưa SHA-256 của token vào workspace tạm.
4. Push source kiểm thử lên Apps Script.
5. Tạo deployment kiểm thử tạm.
6. Tự chạy `setupDatabase_()`, `verifyDatabase_()`, `runPhase4RegressionTests_()` và credential-state check.
7. Nếu credential còn `PENDING_PROVISION` hoặc hash/salt trống, tự bootstrap chỉ các tài khoản cần provision:
   - mỗi tài khoản có mật khẩu tạm riêng;
   - DB chỉ lưu hash + salt;
   - `must_change_password=TRUE`;
   - plaintext chỉ nằm trong một file CSV mới tạo ở My Drive gốc của tài khoản triển khai;
   - runtime phải xác minh file ở trạng thái `PRIVATE` và không có viewer/editor phụ trước khi ghi credential vào DB;
   - nếu lỗi trong quá trình ghi, rollback các hàng đã thay đổi và đưa file handoff vào thùng rác.
8. Chạy lại runtime gate sau bootstrap.
9. Lưu evidence JSON trong GitHub Actions artifact; evidence không chứa mật khẩu/hash/salt/token.
10. Xóa deployment kiểm thử.
11. Khôi phục Apps Script HEAD về source sạch từ repository.
12. Nếu gate cuối `PASS`, tự tìm deployment production theo marker `DANH_BA_PRODUCTION`; nếu chưa có thì tạo, nếu có thì cập nhật.
13. Smoke-test trang public và admin.

Không còn yêu cầu người dùng tự tạo Web App deployment đầu tiên, copy `CLASP_DEPLOYMENT_ID`, chạy wrapper, hoặc provision tài khoản bằng Apps Script Editor.

## Trạng thái gate

- `PASS`: baseline/regression PASS và credential đã sẵn sàng.
- `REVIEW`: trạng thái trung gian khi runtime phát hiện credential cần bootstrap; workflow tự xử lý tiếp.
- `BLOCKED`: baseline/regression/runtime/provisioning không đạt; pipeline dừng fail-closed.

## Việc vẫn cần acceptance trước RUNTIME PASS

- Public directory và tìm kiếm không dấu.
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
