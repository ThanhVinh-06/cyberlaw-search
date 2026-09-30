# Nhịp xuất hiện bảng tài khoản

## Quyết định cuối sau kiểm tra lại

| Before | After | Why |
| --- | --- | --- |
| Phân biệt PUSH từ tra cứu 350ms và các luồng khác 950ms | Một hằng 950ms cho mọi luồng vào users | Nhánh tốc độ riêng gây lại cảm giác nhanh và không đồng bộ |

Đã xóa state.fromLookup và useNavigationType; không thêm phân nhánh mới. Build PASS; test external entry kiểm tra 950ms, delay 0, không có ancestor animation; test reload/tab nội bộ kiểm tra 950ms và chỉ một animation thực chạy. Không thay API/database/quyền.

## Điều chỉnh theo phản hồi tiếp theo

| Before | After | Why |
| --- | --- | --- |
| Reload và chuyển tab nội bộ đều chạy 350ms | Trang user và bảng cùng 950ms | Người dùng yêu cầu các luồng này chậm và đồng bộ hơn |
| Chưa phân biệt luồng từ tra cứu đã được duyệt | Link MainSite gắn state.fromLookup; chỉ PUSH mới giữ 350ms | Giữ nhịp luồng đã duyệt, reload POP dùng 950ms |

Hai ca kiểm thử luồng ngoài/reload/chuyển về từ matrix, stats, documents PASS. Đếm animation chưa bị hủy, bỏ probe StrictMode bị hủy ngay; mỗi entry chỉ một animation bảng thực chạy. 9 ca responsive PASS, build PASS. State chỉ điều khiển thời lượng giao diện, không tham gia kiểm tra quyền; backend/database không đổi.

| Before | After | Why |
| --- | --- | --- |
| Lần tải đầu chờ 180ms trước API | Gọi ngay ở lần tải đầu | Không thêm độ trễ khi chuyển từ tra cứu vào quản trị |
| Bảng reveal 950ms, các khối user khác 350ms | Bảng cũng 350ms | Đồng bộ nhịp, không kéo dài riêng bảng |

Test theo luồng từ trang search, trì hoãn API: reveal một lần, không có animation trên ancestor, delay 0; khi refresh giữ chiều cao và không replay. Test đạt. Phép đo vị trí ban đầu bị ảnh hưởng bởi tự cuộn nút vào viewport; đã sửa test đưa nút vào view trước khi đo, giữ nguyên sai số kiểm tra.

9 ca responsive quản trị đạt ở 320/440/834/900/901/956×440/1024/1440, Edge giả lập; build/TypeScript đạt. Không test thiết bị thật. Thay đổi chỉ lịch gọi đọc dữ liệu và thời lượng UI; không đổi API/quyền/DB/dependency, không áp dụng kiểm thử tấn công server trong lượt này.
