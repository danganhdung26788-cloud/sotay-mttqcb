# Deployment

## Trạng thái

- Repository: `danganhdung26788-cloud/sotay-mttqcb`.
- Module: `apps/danh-ba-mttq-cao-bang/`.
- Deploy/runtime workflow: `.github/workflows/danh-ba-deploy.yml`.
- `@google/clasp`: 3.4.1.
- Phase 4 status: **RUNTIME PASS**.
- Production Web App: https://script.google.com/macros/s/AKfycbwmVqvqZoelpQb30PMsczG7b1Zr3tC724ZVjWq41oLplK-oMSAKlibCy6QkojZEAyHo/exec
- Accepted runtime commit: `4d0dbc71cd750a756fc503dde0dedeaa51ad8e5c`.
- Accepted runtime run: `36096260212`.
- Không lưu credential/token/mật khẩu trong repository hoặc GitHub log.

## Cơ chế Phase 4A/4B/4C

Sau khi thay đổi được merge vào `main`, workflow tự thực hiện:

1. Validate source.
2. Nạp OAuth/clasp từ GitHub Secrets.
3. Sinh token runtime dùng một lần và chỉ đưa SHA-256 của token vào workspace tạm.
4. Push source kiểm thử lên Apps Script.
5. Tạo deployment kiểm thử tạm.
6. Chạy database baseline, regression và credential-state gate.
7. Tự bootstrap chỉ tài khoản còn thiếu credential; plaintext chỉ được ghi vào owner-private Drive handoff file.
8. Chạy lại baseline.
9. Tạo private clone của production database.
10. Chạy core acceptance trên clone: public payload/search, province admin + 2 UNIT_ADMIN, scope, level-3, contact CRUD/move, session invalidation, avatar, review OPTIONAL/REQUIRED, stale approval.
11. Chạy backup/restore acceptance trên clone: BACKUP_LOG, unregistered source denied, registered preview, PRE_RESTORE, restore operational data.
12. Cleanup toàn bộ clone/test artifacts.
13. Xóa runtime deployment tạm và khôi phục Apps Script HEAD về source sạch.
14. Chỉ khi tất cả gate PASS mới tạo/cập nhật deployment production.
15. Smoke-test public/admin HTML production.

## Gate semantics

- `PASS`: cho phép pipeline đi tiếp.
- `REVIEW`: trạng thái trung gian, hiện dùng cho credential bootstrap tự động.
- `BLOCKED`: fail-closed; production deployment không được cập nhật.

## Runtime acceptance đã xác nhận

- Baseline production: 57 organizations / 56 communes / 466 contacts / 57 users / 56 UNIT_ADMIN.
- Credential: 57/57 PROVISIONED; 57/57 buộc đổi mật khẩu lần đầu.
- Public directory + tìm kiếm không dấu: PASS.
- Public payload secret/internal leakage guard: PASS.
- Province admin + 2 UNIT_ADMIN: PASS.
- Cross-scope read/write: DENIED đúng thiết kế.
- Level-3 và contact CRUD/move: PASS.
- Password reset/session invalidation: PASS.
- Avatar scope/MIME-signature guards: PASS.
- Review OPTIONAL/REQUIRED/stale: PASS.
- Backup + BACKUP_LOG: PASS.
- Restore source không đăng ký: DENIED.
- Restore-on-clone + PRE_RESTORE: PASS.
- Clone cleanup: PASS.
- Production read-back sau acceptance: không đổi baseline, level-3 test = 0.
- Public/admin production smoke: PASS.
- Public UI V2 production: PASS.
- Ban/Nhóm scoped CRUD + contact assignment + inactive guard: PASS.
- Public level/position filters + Admin entry: PASS.

Phase 4 hiện ở trạng thái **RUNTIME PASS**.
