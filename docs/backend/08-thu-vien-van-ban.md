# Thư viện văn bản

## API công khai

- `GET /api/library`: metadata của Luật `116/2025/QH15` và mục lục theo điều.
- `GET /api/library/articles/{so_dieu}`: các khoản/điểm của một điều, sắp xếp theo `thu_tu`.
- `GET /api/library/pdf`: tải PDF nguồn khi văn bản đang `published` và tệp nằm trong allowlist.

API chỉ đọc văn bản đã công bố, không trả đường dẫn tệp nội bộ và luôn kiểm tra lại trạng thái cùng phiên bản trong transaction snapshot. Mục lục tối đa 5.000 điều; một điều tối đa 1.000 đơn vị. Các endpoint dùng giới hạn truy cập chung với tra cứu công khai.

## Frontend

`LibraryView` tải mục lục trước rồi tải chi tiết theo điều được chọn. Request cũ bị hủy khi người dùng đổi điều; phản hồi đến muộn không thay thế nội dung mới. Node nội dung được giữ ổn định để tránh chớp layout. Fade In Up dùng 950ms, delay 0/80/160ms và không chạy lại khi đổi điều hoặc tải lại dữ liệu.

## Giới hạn kiểm thử

Đã kiểm thử SQLite/fixture, build và Edge giả lập responsive. Chưa kiểm thử thiết bị thật, DAST production hoặc backup/restore; trước deploy cần chạy các mục tương ứng trong `docs/security/04-deployment.md` trên staging được ủy quyền.
