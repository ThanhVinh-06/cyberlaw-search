# Rà soát bảo mật: Tra cứu pháp luật

- Ngày: 01/10/2026. Phạm vi `/api/search`, `/api/search/{id}`, MainSite và client API.
- Dữ liệu kiểm thử: SQLite in-memory và `storage/framework/testing/auth-browser.sqlite`, tài khoản giả `example.test`. Không ghi/seed/xóa MySQL thật.
- Nhóm liên quan: CL-01 (công bố), CL-05 (SQL/XSS), CL-08 (nguồn/phiên bản), CL-09 (log), CL-10 (lỗi), giới hạn tài nguyên API.

| Kiểm tra | Kết quả | Bằng chứng và giới hạn |
|---|---|---|
| Biên công bố | PASS | PublicSearchTest: guest không đọc draft/archived/luật 2018 kể cả ID trực tiếp; thu hồi công bố áp dụng ở request kế tiếp |
| Validation/SQL | PASS | Giới hạn q, enum, trang, ngày; chuỗi SQL/wildcard là dữ liệu; ID quá lớn trả 404 |
| XSS/nguồn | PASS | Chỉ URL HTTP(S); không trả đường dẫn tệp; HTTP browser test render script dạng chữ, không có script node |
| Lạm dụng | PASS | Quota 60/phút chung list/detail; 429 có request ID |
| Log | PASS có giới hạn | Sự kiện search và HTTP có correlation, query canary không vào file log ứng dụng. Rotation/fallback chung có test sẵn. Access log hosting/cảnh báo chưa thử |
| UI lỗi/race/phân trang | PASS | Fixture Playwright: lỗi không fallback demo, phản hồi cũ không đè mới, phân trang giữ bộ lọc đã gửi, detail 404 không hiện nguyên văn cũ |
| Responsive | PASS giả lập | HTTP thật 320/440/834/956×440/1440; public reveal thêm các mốc 760/761/1150/1151; bàn phím/reduced motion trong bộ animation. Không thử thiết bị thật |
| Build/kiểu dữ liệu | PASS | `npm run build`, `npm run typecheck:e2e`; cảnh báo bundle trên 500KB vẫn tồn tại |
| Dependency/SAST | NOT RUN đợt này | Không đổi dependency; không coi test chức năng là audit dependency hay chứng nhận an toàn toàn hệ thống |
| Upload/SSRF/AI/audit ghi DB | N/A | API chỉ đọc dữ liệu; không fetch URL, upload, gọi model hoặc ghi nghiệp vụ |

## Lỗi tìm thấy và sửa

- Sửa tìm số điều có dấu và không dấu để không phụ thuộc collation SQLite/MySQL; test lại đạt.
- Sửa cận ngày `to` khi thiếu `from`; test lại đạt.
- Chặn URL nguồn không an toàn và ID vượt miền integer; test lại đạt.
- Chuyển reveal sang lúc nhận kết quả, giữ trạng thái keyboard tại thời điểm gửi; bỏ qua phản hồi cũ. Giữ vùng loading ổn định, không dịch thẻ lên/xuống khi request bắt đầu/kết thúc.

| Before | After | Why |
|---|---|---|
| Tra cứu 3 mẫu tại client | API chỉ trả nội dung đã công bố | Cùng dữ liệu do admin quản lý |
| Animation chạy trước khi mạng trả về | Chạy một lần cùng kết quả mới | Không replay thẻ cũ rồi đổi nội dung |
| Không có phân trang/loading/error server | Có các trạng thái và phân trang 30 mục | Đọc được toàn bộ kết quả, thấy lỗi rõ ràng |

## Kết luận và giới hạn

Đủ luồng tra cứu từ khóa cơ bản trong phạm vi một luật. Không tự công bố kho thật. Search chuẩn hóa/lọc trong PHP phù hợp dữ liệu hiện tại nhưng chưa kiểm thử tải production và chưa có truy hồi ngữ nghĩa. Chưa xác nhận deploy-ready; proxy access log phải bỏ query string, HTTPS/cookie/backup/cảnh báo tiếp tục theo checklist deploy. Không đổi schema/env hay gửi email ngoài môi trường giả.

Kết quả chạy: toàn bộ PHPUnit 84 tests/926 assertions đạt trước khi thêm ca ID quá lớn; sau đó PublicSearchTest 6 tests/115 assertions đạt. UI cũ main-site + search-animation 5 tests đạt; public-reveal + public-search 12 tests đạt; HTTP thật 1 test gồm 5 viewport đạt. File ảnh/log thô trong thư mục test bị Git bỏ qua.

Kiểm tra cuối sau ổn định vùng loading: build PASS; public-reveal/public-search/search-animation 15/15 PASS; article-animation 4/4 PASS (không nhảy layout, mở/đóng popup, trả focus, reduced motion, resize). GET read-only qua proxy local 5173 trả luật 116 và total=0, không sửa trạng thái kho thật.
