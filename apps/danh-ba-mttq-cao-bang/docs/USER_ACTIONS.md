# Việc người dùng cần thao tác/cấp quyền

OAuth/clasp ban đầu đã hoàn thành và GitHub đã có `CLASPRC_JSON` + `CLASP_JSON`.

## Trạng thái vận hành bình thường

Người dùng **không cần**:

- mở Apps Script Editor để chạy baseline/regression;
- chạy `clasp push` thủ công;
- tạo Web App deployment đầu tiên bằng UI;
- copy Deployment ID sang GitHub Secret;
- tự kiểm tra credential bằng wrapper;
- tự đặt một mật khẩu khởi tạo chung cho 57 tài khoản.

Workflow tự bootstrap các tài khoản còn `PENDING_PROVISION` bằng mật khẩu tạm riêng từng tài khoản. Plaintext không đi qua GitHub log/chat; một file CSV bàn giao riêng tư được tạo trong My Drive của tài khoản triển khai và tên file được ghi vào workflow summary.

## Khi người dùng thật sự cần tham gia

1. Google yêu cầu OAuth/consent lại.
2. Cần lấy file `DANH_BA_CREDENTIAL_HANDOFF_*.csv` trong My Drive để bàn giao mật khẩu tạm cho đúng đơn vị; các tài khoản buộc đổi mật khẩu ở lần đăng nhập đầu.
3. Baseline dữ liệu lệch bất thường cần quyết định nghiệp vụ.
4. Một acceptance mutation có rủi ro không thể rollback tự động.

Không gửi hoặc commit mật khẩu quản trị, refresh token, `.clasprc.json`, private key hoặc OAuth client secret.
