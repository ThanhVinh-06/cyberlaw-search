# CyberLaw — Bản thiết kế giao diện

Giao diện lấy cảm hứng từ trang tìm kiếm Bộ Công an theo yêu cầu người dùng, với nhận diện CyberLaw riêng.

## Xem thử

Mở `index.html` bằng trình duyệt, hoặc chạy máy chủ tĩnh trong thư mục này:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Truy cập http://127.0.0.1:4173. Font Be Vietnam Pro được tải từ Google Fonts; khi không có mạng, dùng font hệ thống.

## Đã có

- Sidebar luôn hiện bên trái trên desktop; menu vẫn hiển thị dạng lưới trên mobile.
- Form tìm kiếm, lọc loại nội dung và ngày ban hành, đặt lại bộ lọc.
- Ba kết quả minh họa từ Điều 1, 2, 44 của Luật 116/2025/QH15.
- Xem trích đoạn, liên kết đến nguồn Chính phủ, thư viện và mục thuật ngữ.
- Robot AI nguyên bản làm nút mở chat; hội thoại mẫu và nút mở căn cứ.
- Bố cục responsive, điều khiển bằng bàn phím, Escape đóng chat/điều khoản.

## Phạm vi

Đây là prototype HTML/CSS/JavaScript, chưa phải hệ thống AI hoàn chỉnh. Tìm kiếm hiện lọc chuỗi trong ba bản ghi minh họa. Chat trả phản hồi dựng sẵn và không gửi dữ liệu đến dịch vụ AI. Không có cơ sở dữ liệu, tài khoản hay lịch sử lưu lâu dài.

Tài liệu prompt cho Stitch: [04-prompt-stitch.md](../docs/prompts/04-prompt-stitch.md).

Từ thư mục gốc dự án cũng có thể chạy `python scripts/serve_frontend.py`. Đây là đường dẫn giao diện mới sau khi đổi tên thư mục `prototype` thành `frontend`.

Ảnh robot: `assets/ai-assistant.png`, được tạo riêng bằng ImageGen cho đồ án. Các đoạn pháp lý lấy từ tài liệu người dùng cung cấp; nguồn đối chiếu nằm trong phần xem điều khoản.
