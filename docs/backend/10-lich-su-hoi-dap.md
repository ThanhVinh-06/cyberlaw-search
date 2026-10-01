# Lịch sử hỏi đáp

## API

- `GET /api/history?page=` liệt kê các hội thoại của tài khoản hiện tại.
- `GET /api/history/{id}?page=` đọc tin nhắn và bản chụp căn cứ của hội thoại thuộc tài khoản hiện tại.
- `DELETE /api/history/{id}` xóa hội thoại thuộc tài khoản hiện tại; khóa ngoại xóa tin nhắn và trích dẫn liên quan.

Các route yêu cầu phiên active, quyền `xem_lich_su_chat`, CSRF cho xóa và giới hạn tốc độ. Admin không có bypass ownership. Nội dung căn cứ là snapshot tại thời điểm trả lời; nguồn URL được lọc ở server.

Giao diện có trạng thái loading/error/rỗng, phân trang, xác nhận xóa, keyboard focus và Fade In Up 950ms. Các cuộc hỏi đáp demo trong phiên vẫn hiển thị tạm thời nhưng không ghi vào database.
