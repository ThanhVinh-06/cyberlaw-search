# MySQL, tài khoản và phân quyền

Cập nhật ngày 30/09/2026. Database hiện có 11 bảng theo [thiết kế dữ liệu](../design/04-co-so-du-lieu.md); đã có giao diện React `/login`, `/register` và `/forgot-password`, kiểm tra form phía client; đã tạo tài khoản Quản trị viên mẫu trong bảng `nguoi_dung`. Thứ tự triển khai ở [bản chuẩn bị backend](03-chuan-bi-backend.md).

## 1. Phần đã được yêu cầu và phần đề xuất

- Người dùng chọn MySQL và muốn có trang đăng ký, đăng nhập, phân quyền.
- Đề xuất Laravel quản lý xác thực và quyền; Python tập trung xử lý AI.
- Đề xuất mô hình quyền tối thiểu: khách, người dùng, quản trị viên. Chỉ `user` và `admin` là giá trị `vai_tro` trong bảng `nguoi_dung`; khách không phải tài khoản trong database.
- Chính sách chức năng bên dưới là đề xuất để triển khai, có thể điều chỉnh trước khi viết API.

## 2. Ma trận quyền đề xuất

| Chức năng                                | Khách                                | Người dùng  | Quản trị viên              |
| ---------------------------------------- | ------------------------------------ | ----------- | -------------------------- |
| Tra cứu công khai, xem luật và thuật ngữ | Có                                   | Có          | Có                         |
| Đăng ký, đăng nhập                       | Có                                   | Đã có phiên | Đã có phiên                |
| Chat AI                                  | Có (hội thoại lưu nhãn khách vãng lai) | Có          | Có                         |
| Xem lịch sử chat                         | Không                                | Của mình    | Của mình                   |
| Sửa hồ sơ, đổi mật khẩu, đăng xuất       | Không                                | Của mình    | Của mình                   |
| Quản lý văn bản, điều khoản và keyphrase | Không                                | Không       | Có                         |
| Duyệt tri thức và yêu cầu lập chỉ mục    | Không                                | Không       | Có                         |
| Quản lý vai trò và trạng thái tài khoản  | Không                                | Không       | Có, có kiểm tra và nhật ký |

Chat, lịch sử, hồ sơ và quản trị là các phần được đề xuất đi kèm tài khoản; ưu tiên thực hiện theo từng giai đoạn. Vai trò admin không tự cho quyền đọc hội thoại riêng của người khác. Từ 02/10/2026 khách vãng lai **dùng được** Chat AI (hội thoại lưu với `hoi_thoai.ma_nguoi_dung IS NULL`, nhãn "Khách vãng lai", hiện trong trang thống kê admin) nhưng **không** xem được lịch sử chat; xem `docs/backend/11-ai-truy-hoi-cuc-bo.md` và `docs/security/reviews/2026-10-02-khach-vang-lai-chat.md`.

## 3. Các màn hình

### Đăng ký — `/register`

Trường bắt buộc: họ tên, email, mật khẩu, xác nhận mật khẩu. Hiển thị/ẩn mật khẩu, lỗi cạnh trường và trạng thái đang gửi. Có liên kết sang đăng nhập. Không có ô chọn vai trò.

Laravel kiểm tra email duy nhất và các quy tắc mật khẩu; client chỉ kiểm tra sớm để cải thiện trải nghiệm. Sau đăng ký thành công chuyển sang đăng nhập với thông báo rõ ràng. Nếu bổ sung xác minh email, cần cấu hình gửi thư và luồng xác minh thật.

### Đăng nhập — `/login`

Email, mật khẩu, hiện/ẩn mật khẩu và nút đăng nhập. Sai thông tin hiển thị thông báo chung, giữ email, không giữ mật khẩu lâu dài. Đăng nhập thành công quay lại đường dẫn nội bộ đang yêu cầu hoặc trang tra cứu. Chỉ chấp nhận đường dẫn quay lại thuộc ứng dụng.

Theo yêu cầu mới, đã có giao diện quên mật khẩu dùng mã xác nhận email: nhập email → gửi mã → xác nhận mã → nhập mật khẩu mới và xác nhận → quay về đăng nhập. Bản hiện tại ghi rõ dùng mã minh họa, không gửi thư hoặc đổi mật khẩu thật. Backend cần triển khai gửi mã và kiểm tra ở server bằng bảng `yeu_cau_dat_lai_mat_khau`; không dùng luồng gửi liên kết như đề xuất cũ.

### Trạng thái đã đăng nhập

Khu vực tài khoản hiển thị tên người dùng và menu đăng xuất. Sidebar quản trị xuất hiện theo quyền lấy từ API. Route phía frontend hỗ trợ điều hướng, nhưng server vẫn kiểm tra quyền cho từng yêu cầu.

### Trang quản trị — `/admin`

Các mục cần thiết: tài khoản; văn bản và tri thức; trạng thái cập nhật chỉ mục. Dùng cùng hệ màu CyberLaw, bảng có trạng thái, lỗi và thao tác rõ ràng. Người dùng thường truy cập bị trả 403; khách cần đăng nhập. Không dùng số thống kê giả trong bản triển khai.

## 4. Xác thực và quyền ở backend

- Dùng Laravel Sanctum với cookie/session cho SPA do mình sở hữu; chuẩn bị CSRF trước yêu cầu thay đổi dữ liệu. Cookie phiên đặt HttpOnly và Secure khi dùng HTTPS; cấu hình CORS/credentials và tên miền đúng môi trường.
- Viết endpoint đăng ký/đăng nhập/đăng xuất hoặc dùng thành phần auth Laravel phù hợp. Sanctum đảm nhiệm xác thực SPA, không tự tạo toàn bộ luồng tài khoản.
- Password lưu bằng cơ chế hash của Laravel; không lưu mật khẩu thuần hoặc gửi mật khẩu sang Python.
- Server gán `vai_tro=user` khi đăng ký, bỏ qua/từ chối trường vai trò do client gửi. Tạo admin ban đầu bằng lệnh hoặc seeder có thông tin được cấu hình riêng, không hardcode mật khẩu dùng chung.
- Policies/Gates kiểm tra vai trò và chủ sở hữu đối tượng. Đọc lịch sử phải kiểm tra `hoi_thoai.ma_nguoi_dung` khớp `ma_nguoi_dung` của tài khoản đang đăng nhập; không chỉ kiểm tra đã đăng nhập.
- Đăng nhập thay đổi ID phiên; đăng xuất vô hiệu phiên. Tài khoản bị khóa phải mất quyền ở backend, kể cả khi trình duyệt còn hiển thị màn hình cũ.
- Hạn chế số lần thử đăng nhập và số yêu cầu chat. Ghi nhật ký thay đổi quyền. Không cho xóa/hạ quyền quản trị viên hoạt động cuối cùng.
- Laravel trả 401 khi chưa có phiên hợp lệ, 403 khi thiếu quyền, 422 khi dữ liệu không hợp lệ; frontend xử lý rõ từng trạng thái.

## 5. Thiết kế dữ liệu MySQL tối thiểu

| Bảng                            | Mục đích / trường quan trọng                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `nguoi_dung`                    | ma_nguoi_dung, ho_ten, thu_dien_tu duy nhất, mat_khau băm, vai_tro, trang_thai, ngay_tao, ngay_cap_nhat        |
| `yeu_cau_dat_lai_mat_khau`      | Mã xác nhận và token đã băm, số lần thử, hạn dùng, thời điểm xác nhận/sử dụng/hủy; FK đến người dùng           |
| `van_ban`                       | ma_van_ban, so_hieu, tieu_de, nguồn, phien_ban_noi_dung, trang_thai                                            |
| `dieu_khoan`                    | ma_dieu_khoan, so_dieu, so_khoan, ky_hieu_diem, noi_dung, ma_van_ban; vị trí duy nhất trong văn bản            |
| `tu_khoa`, `dieu_khoan_tu_khoa` | Cụm từ, biến thể, định nghĩa có nguồn và liên kết điều khoản                                                   |
| `quy_dinh`                      | Loại quy định, chủ thể, hành vi, điều kiện, ngoại lệ và căn cứ                                                 |
| `hoi_thoai`                     | ma_hoi_thoai, ma_nguoi_dung, tieu_de, ngay_tao, ngay_cap_nhat; triển khai khi làm lịch sử chat                 |
| `tin_nhan`                      | ma_tin_nhan, ma_hoi_thoai, nguoi_gui, noi_dung, ngay_tao, ngay_cap_nhat                                        |
| `trich_dan`                     | ma_trich_dan, ma_tin_nhan, ma_dieu_khoan, phien_ban_noi_dung và bản chụp nội dung căn cứ tại thời điểm trả lời |

Tên bảng/cột dùng tiếng Việt không dấu. Chọn utf8mb4 để lưu nội dung tiếng Việt; dùng khóa ngoại và index cho các quan hệ truy vấn. Định nghĩa nằm trong `tu_khoa`, quy định nằm trong `quy_dinh`; bộ QA đánh giá giữ ở tệp trong `data/evaluation/`. Lưu nguồn và phiên bản cùng câu trả lời để tái hiện căn cứ khi văn bản thay đổi.

Bản đầu dùng session driver `file` của Laravel và nhật ký ứng dụng, nên chưa tạo bảng `sessions` hoặc `audit_logs`. Khi triển khai cần cấu hình driver rõ ràng và ghi lại thay đổi quyền trong log, tránh ghi mật khẩu hoặc mã phiên.

Với hai vai trò cố định, trường `vai_tro` và Policies là đủ cho bản đầu; chưa cần bộ bảng quyền động nhiều cấp. Giá trị `user` là người dùng, `admin` là quản trị viên. MySQL được Laravel quản lý. Python dùng bản xuất tri thức đã duyệt theo phiên bản và chỉ mục riêng; không ghi trực tiếp vào các bảng tài khoản.

Laravel cần khai báo tên bảng, khóa chính, khóa ngoại và cột thời gian trong model. Phần auth phải dùng `thu_dien_tu`, `mat_khau`, `ma_ghi_nho`; không mặc định tương thích với bộ khởi tạo Laravel. Xem [quy ước ánh xạ](../design/04-co-so-du-lieu.md#ánh-xạ-tên-tiếng-việt-trong-laravel).

## 6. Tiêu chí kiểm tra khi triển khai

1. Đăng ký email mới thành công; email trùng và mật khẩu xác nhận sai bị chặn.
2. Gửi `vai_tro=admin` từ client không tạo được admin.
3. Đăng nhập đúng, sai và đăng xuất có hành vi phù hợp; phiên cũ không dùng lại sau đăng xuất.
4. User không gọi được API quản trị dù tự nhập URL hoặc sửa giao diện.
5. User A không đọc/sửa/xóa hội thoại của user B bằng cách đổi ID.
6. Khóa tài khoản có hiệu lực ở backend; quản trị viên cuối cùng không bị vô hiệu hóa nhầm.
7. Màn hình đăng ký/đăng nhập dùng được bằng bàn phím, mobile và chế độ giảm chuyển động.

## Nguồn kỹ thuật

- https://laravel.com/framework/docs/13.x/database
- https://laravel.com/framework/docs/13.x/sanctum#spa-authentication
- https://laravel.com/framework/docs/13.x/authorization
