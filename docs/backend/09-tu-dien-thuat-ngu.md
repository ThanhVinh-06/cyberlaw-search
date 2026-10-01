# Từ điển thuật ngữ

`GET /api/terms?q=&page=` đọc bảng `tu_khoa`, nối với điều khoản và văn bản sở hữu. API chỉ trả thuật ngữ có căn cứ trong Luật `116/2025/QH15` đang `published`; thuật ngữ rời, bản nháp và luật lịch sử không xuất hiện.

Kết quả gồm cụm từ, biến thể, định nghĩa và DTO điều khoản đã được lọc an toàn. Tìm kiếm không phân biệt dấu, giới hạn truy vấn 120 ký tự, 12 mục/trang và tối đa 1.000 trang. Giao diện giữ popup căn cứ pháp lý hiện có và Fade In Up 950ms; mỗi request cũ bị hủy khi tìm kiếm lại.
