# Nghi thức bốc 5 lá Tarot

Ứng dụng web tĩnh để thực hiện trải bài Tarot 5 lá từ bộ ảnh 78 lá.

## Luồng sử dụng

1. Ghi câu hỏi hoặc điều đang băn khoăn.
2. Bắt đầu phần tĩnh tâm ngắn.
3. Đếm ngược và xáo bài.
4. Tự tay mở từng lá từ trái sang phải.
5. Sau khi mở đủ 5 lá, chụp ảnh hoặc sao chép câu hỏi cùng kết quả để gửi AI giải thích.

## Nguyên tắc bốc bài

- Chọn ngẫu nhiên 5 lá không trùng nhau bằng `crypto.getRandomValues` khi trình duyệt hỗ trợ.
- Mỗi lá được random độc lập: 50% xuôi, 50% ngược.
- Không ép một lần bốc phải có số lượng lá xuôi/ngược cố định.
- Lá ngược được xoay ảnh 180 độ và ghi rõ **NGƯỢC**.
- Kết quả xuôi/ngược được đưa vào nội dung sao chép cho AI.

## Tính năng

- Gán đủ 78 Google Drive file ID duy nhất.
- Bốc từng lá tạo cảm giác hồi hộp.
- Khóa lá kế tiếp cho đến khi lá hiện tại được mở.
- Tĩnh tâm, lời dẫn và đếm ngược trước khi mở bài.
- Âm thanh nhẹ tạo bằng Web Audio, không dùng file ngoài.
- Lưu và khôi phục trải bài gần nhất.
- Chế độ chụp 5 lá trên một hàng.
- Không cần backend hoặc API key.

## Lưu ý

Phần “nghi thức” chỉ tạo không gian tập trung và tự suy ngẫm. Ứng dụng không tuyên bố chứng minh hoặc bảo đảm năng lực siêu nhiên. Tarot không thay thế tư vấn y tế, pháp lý hoặc tài chính.

## GitHub Pages

`https://danganhdung26788-cloud.github.io/sotay-mttqcb/`
