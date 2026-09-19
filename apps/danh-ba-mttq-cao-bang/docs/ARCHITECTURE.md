# Architecture

`Public/Admin UI → Apps Script Services → Permission/Validation → Google Sheets + Drive`

## Data
`ORGANIZATIONS`, `GROUPS`, `CONTACTS`, `USERS`, `ROLES`, `SETTINGS`, `AUDIT_LOG`,
`IMPORT_LOG`, `REVIEW_QUEUE`, `REVIEW_REQUESTS`, `BACKUP_LOG`.

## Scope
- `PROVINCIAL_ADMIN`: toàn hệ thống.
- `UNIT_ADMIN`: xã/phường được giao + cấp 3 trực thuộc.
- Mọi mutation phải kiểm tra quyền ở backend.

## Cấp 3
Không seed sẵn. Admin xã tự tạo thôn/xóm/tổ dân phố trong scope.
