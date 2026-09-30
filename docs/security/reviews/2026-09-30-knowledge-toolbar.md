# Điều chỉnh thanh công cụ kho tri thức

Phạm vi: chỉ frontend, bỏ thông báo kết nối thành công và chuyển nút tải lại vào đầu nhóm bộ lọc. Giữ thông báo lỗi API, khóa thao tác ghi khi lỗi và cho phép tải lại phục hồi. Không sửa route, phân quyền, trạng thái công bố hoặc database.

| Before | After | Why |
| --- | --- | --- |
| Dòng kết nối và nút tải lại nằm riêng | Nút nằm bên trái các bộ lọc trên thanh tìm kiếm | Gọn bố cục theo yêu cầu |
| Bỏ cả dòng trạng thái làm mất cảnh báo lỗi | Lỗi API vẫn hiện bằng `role=alert` khi có lỗi | Người dùng biết lý do và có thể tải lại |

- Build/TypeScript: PASS; cảnh báo bundle >500KB có sẵn.
- Kiểm thử lỗi API/phục hồi và responsive: 8/8 PASS bằng Edge giả lập 320/440/834/900/901/956×440/1440. Đã xem ảnh 440px; chưa kiểm tra thiết bị thật.
- Bảo mật server: N/A cho thay đổi này vì không đổi API/auth/dữ liệu. Không chạy lại các ca tấn công không liên quan; giữ cơ chế chặn ghi khi dữ liệu lỗi.
