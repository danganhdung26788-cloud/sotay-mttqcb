# Danh bạ MTTQ tỉnh Cao Bằng

Google Apps Script Web App quản lý và tra cứu danh bạ MTTQ tỉnh Cao Bằng theo mô hình 3 cấp.

## Trạng thái
**V1.1 – Phase 4 RUNTIME PASS.**

Production Web App: https://script.google.com/macros/s/AKfycbwmVqvqZoelpQb30PMsczG7b1Zr3tC724ZVjWq41oLplK-oMSAKlibCy6QkojZEAyHo/exec

Production read-back:
- 57 đơn vị, trong đó 56 xã/phường; 0 dữ liệu cấp 3 test.
- 466 hồ sơ liên hệ.
- 57 tài khoản, trong đó 56 `UNIT_ADMIN`.
- 57/57 tài khoản `PROVISIONED`; buộc đổi mật khẩu lần đầu.
- Phase 4A/4B/4C runtime gates và clone-only acceptance: PASS.
- Public UI V2 production: PASS — giao diện gọn, search trọng tâm, sidebar thu gọn, filter nhóm, thẻ 4 cột, chế độ danh sách và responsive mobile/tablet.
- Quản trị Ban/Nhóm/Hội: PASS — CRUD theo scope, gán cán bộ vào nhóm, chặn cross-scope và chặn ngừng nhóm còn cán bộ hoạt động.
- Public filter: PASS — lọc theo Cấp tỉnh/Xã-phường/Cấp 3 và Chức vụ.

Database vận hành: `1E1pOxwBiQI4GDehXrYYghwULUg6pGZhbILXEOs-vIcY`.

## Chức năng
- Public directory, tìm kiếm không dấu, cây 3 cấp.
- Admin theo scope.
- CRUD/soft-delete/chuyển đơn vị.
- Admin xã tự quản lý cấp 3.
- Import/Export CSV.
- Tài khoản, session versioning, audit.
- Avatar Drive.
- Review workflow `OPTIONAL` / `REQUIRED`.
- Backup/restore có snapshot.
- Regression và runtime acceptance tự động.
- Restore acceptance chỉ chạy trên private clone, không trên production.

## Source of Truth
GitHub `main` tại `danganhdung26788-cloud/sotay-mttqcb` là source code được phép deploy production. Google Drive giữ database, hồ sơ dự án và backup.

## Branch
- `main`: source production đã nghiệm thu.
- `develop`: đồng bộ từ production checkpoint sau nghiệm thu.
- `release/v1.1-phase4-build-ready`: checkpoint V1.1, được đồng bộ sau Phase 4 RUNTIME PASS.

## Validate
```bash
node scripts/validate.mjs
```

## Apps Script
Không commit `.clasp.json`, `.clasprc.json`, token hoặc mật khẩu. Xem `docs/DEPLOYMENT.md`.
