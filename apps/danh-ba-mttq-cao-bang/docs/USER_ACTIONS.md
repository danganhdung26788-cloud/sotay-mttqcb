# Việc người dùng cần thao tác/cấp quyền

OAuth/clasp ban đầu đã hoàn thành và GitHub đã có `CLASPRC_JSON` + `CLASP_JSON`.

## Trạng thái vận hành bình thường

Người dùng **không cần**:

- mở Apps Script Editor để chạy `setupDatabase_()` / `verifyDatabase_()` / regression;
- chạy `clasp push` thủ công;
- tạo Web App deployment đầu tiên bằng UI;
- copy Deployment ID sang GitHub Secret;
- tự kiểm tra credential bằng wrapper tạm.

Workflow Phase 4A tự xử lý các bước trên và chỉ trả một trong ba trạng thái: `PASS / REVIEW / BLOCKED`.

## Chỉ cần người dùng khi thật sự có REVIEW

1. Google yêu cầu OAuth/consent lại.
2. Credential còn `PENDING_PROVISION` và cần quyết định mật khẩu khởi tạo an toàn.
3. Baseline dữ liệu lệch bất thường cần quyết định nghiệp vụ.
4. Một acceptance mutation có rủi ro không thể rollback tự động.

Không gửi hoặc commit mật khẩu quản trị, refresh token, `.clasprc.json`, private key hoặc OAuth client secret.
