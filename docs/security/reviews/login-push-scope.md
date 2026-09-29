# Phạm vi commit đăng nhập

Chỉ công bố mã đăng nhập Laravel/React, bộ kiểm thử bằng dữ liệu giả và tài liệu liên quan. Không đưa `.env` kể cả template, config database, SQL/dump, migration/seed, log, cookie/session, SQLite test hoặc thông tin tài khoản thật vào commit này.

Model xác thực và mã tạo fixture kiểm thử là mã nguồn, không chứa dữ liệu MySQL của người dùng. Các file schema/verification đã được theo dõi trong commit trước không được sửa trong đợt này; không viết lại lịch sử Git.

Máy clone mới cần tự cấu hình môi trường/database. Các thay đổi schema, tài liệu thiết kế database và bàn giao cục bộ có thông tin tài khoản giữ ngoài commit. Kiểm tra nghiệp vụ/bảo mật/responsive tham chiếu `2026-09-29-login-backend.md`; trước push chạy lại PHPUnit, audit dependency và kiểm tra danh sách staged/secrets. Không tuyên bố đã quét toàn lịch sử bằng Gitleaks.

Kiểm tra trước push: 82 file được chọn, không có đường dẫn env/SQL/database config hoặc giá trị bí mật môi trường/tài khoản thật khi đối chiếu nội dung staged. `git diff --cached --check` đạt; npm audit 0 advisory; 5 ca responsive 320/440/834/1440px và landscape đạt. Lượt chạy lại PHPUnit/Composer audit bị lỗi xác thực công cụ duyệt tự động (refresh token bị thu hồi), chưa chạy trong lượt push; kết quả PHP gần nhất được ghi trong báo cáo đăng nhập, không coi lần gọi bị chặn là PASS.
