# Cơ sở dữ liệu CyberLaw Search

Database `cyberlaw_search` trên MySQL 8.0.44 của máy phát triển hiện có **10 bảng, 89 cột**. Ngày 29/09/2026 đã thêm bảng yêu cầu đặt lại mật khẩu, không thay đổi dữ liệu tài khoản hiện có.

Tên bảng và tên cột dùng tiếng Việt không dấu, ví dụ `nguoi_dung.ho_ten`, `van_ban.so_hieu`, `tin_nhan.noi_dung`. Mười bảng là `nguoi_dung`, `yeu_cau_dat_lai_mat_khau`, `van_ban`, `dieu_khoan`, `tu_khoa`, `dieu_khoan_tu_khoa`, `quy_dinh`, `hoi_thoai`, `tin_nhan`, `trich_dan`. Các giá trị ENUM như `user`/`admin` vẫn giữ nguyên.

## Các tệp

- [cyberlaw_search.sql](cyberlaw_search.sql): bản xuất cấu trúc bằng `mysqldump`, dùng để bàn giao hoặc nhập trên máy khác; không chứa tài khoản hay dữ liệu luật.
- [schema.sql](schema.sql): mã SQL nguồn có chú thích, dùng để tạo database lần đầu.
- [verification.json](verification.json): kết quả kiểm tra 9 bảng ban đầu.
- [reset-password-verification.json](reset-password-verification.json): kiểm tra bảng mới bằng transaction và rollback; không giữ tài khoản thử.
- [Migration đặt lại mật khẩu](migrations/20260929_them_dat_lai_mat_khau.sql): chạy **một lần** trên database cũ có 9 bảng; máy phát triển hiện tại đã áp dụng. Máy mới dùng `schema.sql` thì không chạy thêm migration này.
- [Thiết kế và sơ đồ quan hệ](../docs/design/04-co-so-du-lieu.md): giải thích 10 bảng và quy ước sử dụng.

Luồng `/forgot-password` hiện chỉ là giao diện dùng thử, hiển thị mã minh họa trên form, không gửi email hay cập nhật mật khẩu. Bảng mới chuẩn bị cho PHP triển khai xác thực mã ở server. Không dùng logic xác nhận trong trình duyệt làm cơ chế bảo mật thật.

## Mở bằng MySQL Workbench

Trên máy hiện tại, chọn **Refresh All** ở danh sách **Schemas** để thấy `cyberlaw_search`.

Để nhập trên máy khác có MySQL 8.0.16 trở lên: chọn **Server → Data Import → Import from Self-Contained File**, chọn `cyberlaw_search.sql`, rồi **Start Import**. File đã có lệnh tạo và chọn database. Chỉ nhập khi chưa có các bảng cùng tên; không chạy lại vào database đang sử dụng.

Mật khẩu kết nối không nằm trong các tệp này. Khi triển khai Laravel, tạo migrations tương ứng với schema và cấu hình session driver `file`. Model cần khai báo tên bảng, khóa chính, khóa ngoại, `ngay_tao`/`ngay_cap_nhat`; auth cần dùng `thu_dien_tu`, `mat_khau`, `ma_ghi_nho`. Đăng nhập và phân quyền sẽ được xử lý ở backend; xem [hướng dẫn ánh xạ](../docs/design/04-co-so-du-lieu.md#ánh-xạ-tên-tiếng-việt-trong-laravel).
