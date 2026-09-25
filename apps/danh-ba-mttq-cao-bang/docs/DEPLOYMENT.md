# Deployment

## Trạng thái

- Repository: `danganhdung26788-cloud/sotay-mttqcb`.
- Module: `apps/danh-ba-mttq-cao-bang/`.
- Deploy/runtime workflow: `.github/workflows/danh-ba-deploy.yml`.
- `@google/clasp`: 3.4.1.
- Google OAuth, `CLASPRC_JSON`, `CLASP_JSON`, source push, database baseline và Phase 4 regression đã PASS.
- Không lưu credential/token/mật khẩu trong repository hoặc GitHub log.

## Cơ chế Phase 4A/4B/4C

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
9. Tạo thư mục test riêng tư và copy production database thành clone; mọi mutation acceptance chỉ chạy trên clone.
10. Tự kiểm tra public payload/search, province admin + 2 UNIT_ADMIN, scope, level-3, contact CRUD, session invalidation, avatar, review OPTIONAL/REQUIRED, stale approval.
11. Tự tạo backup clone, kiểm tra BACKUP_LOG, chặn restore source không đăng ký, restore thật trên clone và xác nhận PRE_RESTORE.
12. Dọn toàn bộ clone/test artifacts; evidence JSON không chứa mật khẩu/hash/salt/token.
13. Xóa deployment kiểm thử và khôi phục Apps Script HEAD về source sạch.
14. Chỉ khi toàn bộ gate PASS mới tạo/cập nhật deployment production theo marker `DANH_BA_PRODUCTION`.
15. Smoke-test trang public và admin production.

Không còn yêu cầu người dùng tự tạo Web App deployment đầu tiên, copy `CLASP_DEPLOYMENT_ID`, chạy wrapper, hoặc provision tài khoản bằng Apps Script Editor.

## Trạng thái gate

- `PASS`: baseline/regression PASS và credential đã sẵn sàng.
- `REVIEW`: trạng thái trung gian khi runtime phát hiện credential cần bootstrap; workflow tự xử lý tiếp.
- `BLOCKED`: baseline/regression/runtime/provisioning không đạt; pipeline dừng fail-closed.

## Gate còn lại trước RUNTIME PASS

Phase 4C thực hiện acceptance tự động trên clone. Chỉ sau khi workflow thật trên `main` chứng minh tất cả pha `prepare/core/restore/cleanup` PASS, production smoke PASS và read-back production không đổi baseline thì mới cập nhật `SOURCE_STATUS.md` thành **RUNTIME PASS**.
