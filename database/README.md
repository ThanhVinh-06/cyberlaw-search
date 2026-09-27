# Cơ sở dữ liệu CyberLaw Search

Database `cyberlaw_search` đã được tạo trên MySQL 8.0.44 của máy phát triển, gồm 9 bảng rỗng.

Tên bảng và tên cột dùng tiếng Việt không dấu, ví dụ `nguoi_dung.ho_ten`, `van_ban.so_hieu`, `tin_nhan.noi_dung`. Chín bảng là `nguoi_dung`, `van_ban`, `dieu_khoan`, `tu_khoa`, `dieu_khoan_tu_khoa`, `quy_dinh`, `hoi_thoai`, `tin_nhan`, `trich_dan`. Các giá trị ENUM như `user`/`admin` vẫn giữ nguyên.

## Các tệp

- [cyberlaw_search.sql](cyberlaw_search.sql): bản xuất cấu trúc bằng `mysqldump`, dùng để bàn giao hoặc nhập trên máy khác; không chứa tài khoản hay dữ liệu luật.
- [schema.sql](schema.sql): mã SQL nguồn có chú thích, dùng để tạo database lần đầu.
- [verification.json](verification.json): kết quả kiểm tra khóa ngoại, dữ liệu tiếng Việt, tính duy nhất và cách giữ trích dẫn.
- [Thiết kế và sơ đồ quan hệ](../docs/design/04-co-so-du-lieu.md): giải thích 9 bảng và quy ước sử dụng.

## Mở bằng MySQL Workbench

Trên máy hiện tại, chọn **Refresh All** ở danh sách **Schemas** để thấy `cyberlaw_search`.

Để nhập trên máy khác có MySQL 8.0.16 trở lên: chọn **Server → Data Import → Import from Self-Contained File**, chọn `cyberlaw_search.sql`, rồi **Start Import**. File đã có lệnh tạo và chọn database. Chỉ nhập khi chưa có các bảng cùng tên; không chạy lại vào database đang sử dụng.

Mật khẩu kết nối không nằm trong các tệp này. Khi triển khai Laravel, tạo migrations tương ứng với schema và cấu hình session driver `file`. Model cần khai báo tên bảng, khóa chính, khóa ngoại, `ngay_tao`/`ngay_cap_nhat`; auth cần dùng `thu_dien_tu`, `mat_khau`, `ma_ghi_nho`. Đăng nhập và phân quyền sẽ được xử lý ở backend; xem [hướng dẫn ánh xạ](../docs/design/04-co-so-du-lieu.md#ánh-xạ-tên-tiếng-việt-trong-laravel).
