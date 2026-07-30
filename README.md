# Bốc 5 lá Tarot

Ứng dụng web tĩnh để bốc ngẫu nhiên 5 lá từ bộ Tarot huyền bí 78 lá.

## Chức năng

- Đủ 78 lá, mỗi lá được gán một Google Drive file ID riêng.
- Bốc 5 lá không trùng nhau.
- Chờ đủ 5 ảnh tải thành công mới mở **Chế độ chụp ảnh**.
- Hiển thị 5 ảnh trong cùng một hàng ở chế độ chụp.
- Lưu lần bốc gần nhất trên trình duyệt.
- Nhập câu hỏi và sao chép danh sách 5 lá để gửi AI giải thích.
- Không cần backend, cơ sở dữ liệu hoặc API key.

## GitHub Pages

Workflow `.github/workflows/pages.yml` tự triển khai khi có thay đổi trên nhánh `main`.

Địa chỉ dự kiến:

`https://danganhdung26788-cloud.github.io/sotay-mttqcb/`

## Cấu trúc

- `index.html`: giao diện.
- `styles.css`: bố cục và chế độ chụp.
- `app.js`: bốc bài, tải ảnh dự phòng, lưu trạng thái.
- `cards.js`: ánh xạ 78 lá với 78 Google Drive file ID.
- `TEST_REPORT.json`: kết quả kiểm tra cấu trúc dữ liệu.
