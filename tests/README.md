# Kiểm tra chương trình

Các thư mục hiện là khung, chưa có bộ kiểm thử tự động.

- `frontend/`: luồng nhập câu hỏi, xem căn cứ, chat, thao tác bàn phím và mobile.
- `backend/`: kiểm tra đầu vào, cấu trúc phản hồi và lỗi API.
- `retrieval/`: truy vấn không dấu, phủ định, chọn đúng phiên bản, căn cứ không tồn tại và câu ngoài phạm vi.

Bộ câu hỏi đánh giá chất lượng đặt tại `data/evaluation/`; không trộn với mã kiểm thử. Ưu tiên kiểm tra hành vi có nguy cơ sai thực sự, tránh kiểm thử chỉ lặp lại cấu trúc mã.
