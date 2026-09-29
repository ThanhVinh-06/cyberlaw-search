# Backend và AI — khung chuẩn bị

## Đăng nhập đã nối server (29/09/2026)

Laravel đã có đăng ký/đăng nhập/me/logout, quên mật khẩu và xác minh email, session cookie + CSRF, kiểm tra tài khoản hoạt động, middleware admin, giới hạn yêu cầu và log JSON. React đã nối các API này. Xem [tài khoản và kiểm thử](../docs/backend/01-dang-nhap.md), [quên mật khẩu và Mailpit local](../docs/backend/02-quen-mat-khau.md), [xác minh email](../docs/backend/03-xac-minh-email.md). CRUD/AI chưa nối server; chưa xác nhận deploy-ready. Database hiện có 12 bảng/111 cột, migration xác minh đã áp dụng. Ghi chú khởi tạo bên dưới là lịch sử.

**Cập nhật 29/09/2026:** Đọc [chuẩn bị backend theo luật 2025](../docs/requirements/03-chuan-bi-backend.md) trước khi triển khai. Người dùng chọn MySQL và yêu cầu đăng ký/đăng nhập/phân quyền. Kiến trúc đề xuất là Laravel cho API nghiệp vụ và FastAPI cho AI; xem [quyết định công nghệ](../docs/technology-decisions.md) và [yêu cầu tài khoản](../docs/requirements/02-tai-khoan-phan-quyen.md). Cấu trúc `app/` bên dưới vẫn là khung Python ban đầu, chưa thực hiện chuyển đổi.

**Đã khởi tạo Laravel 12.69 (PHP 8.2) tại `api/` ngày 30/09/2026** (chọn Laravel 12 vì XAMPP PHP 8.2.12). Mới có: 11 model Eloquent ánh xạ 11 bảng Việt hóa (`api/app/Models/`), `NguoiDung` làm model xác thực, `.env.example`. **Chưa có route/API/auth/log nào.** Chưa có mô hình AI trong `ai/`.

Chạy cục bộ: `C:\xampp\php\php.exe` (không có trong PATH); Composer dùng `composer.phar` tải từ getcomposer.org (SHA-256 đã kiểm), để ngoài repo. Khi `composer install` báo "Could not delete" là do antivirus/indexer khóa file trên Windows: chạy lại là qua. `php artisan tinker` tương tác có thể treo trong shell không tương tác; dùng script bootstrap hoặc `--execute`.

Kết nối DB: tài khoản `cyberlaw_app` chỉ có SELECT/INSERT/UPDATE/DELETE trên `cyberlaw_search` (không dùng root); mật khẩu chỉ nằm trong `api/.env` (Git bỏ qua). Máy khác phải tự tạo user và `.env`. **Không** chạy `migrate` — schema do `database/` quản lý; các migration mặc định của Laravel (users/cache/jobs) đã xóa, session/cache/queue dùng file/sync.

Chưa có API hoặc mô hình chạy trong thư mục này. Dự kiến đặt PHP/Laravel tại `api/`, Python/FastAPI tại `ai/`; chỉ thêm cấu hình dependency và lệnh chạy sau khi triển khai chức năng thật.

Database MySQL `cyberlaw_search` hiện có 11 bảng, 101 cột, gồm yêu cầu đặt lại mật khẩu và nhật ký quản trị. Xem [thiết kế cơ sở dữ liệu](../docs/design/04-co-so-du-lieu.md). Laravel đã kết nối và đọc qua 11 model; đăng ký, đăng nhập và phân quyền phía server chưa triển khai. Không coi bản dump cục bộ cũ là đã chứa migration 30/09 nếu chưa xuất lại.

Kiểm tra tiếp nhận: PHP 8.2.12, Laravel 12.69.2, PHPUnit đạt 5 test/13 assertion sau sửa ánh xạ tên cột rehash và ẩn hash reset khi serialize. Chạy `C:\xampp\php\php.exe vendor/bin/phpunit` tại `backend/api`. Xem [báo cáo và các mục cần xử lý trước auth](../docs/security/reviews/2026-09-30-backend-handoff.md). Chưa dùng `composer setup` vì script scaffold còn migrate/key generation và frontend npm riêng; chưa dùng password broker mặc định với bảng OTP Việt hóa.

| Thư mục | Trách nhiệm |
|---|---|
| `app/api/` | Endpoint tìm kiếm, hỏi đáp, đọc văn bản và thuật ngữ |
| `app/schemas/` | Kiểm tra dữ liệu đầu vào và mô tả phản hồi |
| `app/services/` | Điều phối truy hồi, căn cứ và trả lời; kết nối LLM nếu cần |
| `app/retrieval/` | Keyphrase, TF-IDF, embedding và xếp hạng kết quả |
| `app/knowledge/` | Truy cập điều khoản, khái niệm, quy định và nguồn |

Đầu vào lấy từ `../data/processed/`, chỉ mục nằm ở `../data/indexes/`, dữ liệu chạy nằm ở `../data/runtime/`. Khi viết mã, xác định đường dẫn từ vị trí dự án hoặc cấu hình, không phụ thuộc vào ổ D của máy tác giả.

Các API ưu tiên theo bản phân tích: `POST /search`, `POST /answer`, `GET /documents`, `GET /provisions/{id}`, `GET /concepts`. Đây là thiết kế dự kiến.

Khóa API nếu dùng phải ở biến môi trường backend, không ghi vào mã frontend. Chức năng tìm điều khoản cần hoạt động được trước khi thêm mô hình sinh câu trả lời.
