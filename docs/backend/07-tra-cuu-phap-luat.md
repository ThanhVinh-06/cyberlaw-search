# Backend tra cứu pháp luật

Cập nhật 01/10/2026. Trang `/search` gọi Laravel; không dùng 3 điều demo khi API lỗi. Thư viện, thuật ngữ và chatbot vẫn giữ phạm vi hiện có, chưa nối backend trong đợt này.

## API công khai

- `GET /api/search`: `q` tối đa 120 ký tự; `mode=all|title|article`; `category=all|general|definition|effect`; `from`, `to` theo ngày ban hành; `page` 1–1000; `per_page` 1–30. UI dùng 30 kết quả/trang.
- `GET /api/search/{id}`: ID đơn vị trong `dieu_khoan`, không phải số điều. Kiểm tra lại trạng thái công bố mỗi lần mở chi tiết; bản không được phục vụ trả 404.
- Khách được đọc; cùng limiter 60 yêu cầu/phút/IP đã HMAC cho danh sách và chi tiết. Giữ origin allowlist, JSON lỗi, request ID và no-store từ middleware chung.
- DTO gồm tiêu đề có điều/khoản/điểm, trích đoạn ngắn, nguyên văn, trang nguồn, URL HTTP(S), phiên bản nội dung và metadata văn bản. Không trả đường dẫn tệp riêng hay dữ liệu tài khoản.

## Quy tắc tìm kiếm và dữ liệu

Chỉ lấy văn bản `published` có số hiệu `116/2025/QH15`. Không tự công bố dữ liệu MySQL thật. Admin duyệt trong Văn bản & Tri thức sau khi đối chiếu nguồn. Nếu chưa có bản đã công bố, kết quả rỗng là đúng.

Tìm cụm từ có/không dấu, không phân biệt hoa thường; tìm số điều với `2`, `Điều 2` trong chế độ số điều, và nhận `Điều 2` ở chế độ toàn nội dung. Bộ lọc giao diện: Khái niệm = Điều 2; Hiệu lực = Điều 44; Quy định khác = các điều còn lại. Đây là nhóm điều phục vụ UI, không phải nhãn `quy_dinh` của hệ thống AI.

Bản đầu chuẩn hóa chữ và lọc trên server PHP sau khi SQL đã giới hạn văn bản được công bố và ngày. Phù hợp kho một luật hiện tại; chưa có full-text index, xếp hạng ngữ nghĩa hoặc trả lời câu hỏi AI. Khi mở rộng nhiều luật cần thiết kế chỉ mục và kiểm tra tải trước deploy. Sắp xếp ổn định theo `thu_tu`, rồi `ma_dieu_khoan`.

Kết quả phân trang theo bộ lọc đã gửi, không dùng nội dung đang gõ chưa tìm kiếm. Phản hồi cũ bị bỏ qua khi có yêu cầu mới. Fade In Up 950ms chạy khi kết quả mới về; gõ không replay, bàn phím/reduced motion giữ cách xử lý hiện có. Vùng thông báo tải có chiều cao cố định để không đẩy thẻ kết quả.

Popup chỉ mount sau khi API chi tiết trả về: đo kích thước nguyên văn hoàn chỉnh ngay từ đầu để shared layout không bị đổi chiều cao giữa animation. Trong lúc chờ, nút có `aria-busy` và vùng status báo tải. Escape, tìm kiếm mới hoặc chuyển trang hủy hiệu lực phản hồi đang chờ; lỗi vẫn hiện thông báo, không dùng nguyên văn cũ làm fallback.

## Kiểm tra

- PHPUnit `PublicSearchTest`: bản nháp/lịch sử/archived bị chặn, ngày chỉ có cận trên, tìm không dấu/số điều/tiêu đề, phân trang, đầu vào bất thường, giới hạn tần suất, URL nguồn và log canary.
- `public-search-backend.spec.ts` với `playwright.auth.config.ts`: HTTP thật, SQLite riêng và tài khoản giả, tạo/duyệt dữ liệu giả bằng API quản trị, kiểm tra khách đọc và popup ở 320/440/834/956×440/1440.
- `public-search.spec.ts`: fixture UI kiểm tra phân trang, lỗi API không fallback, chi tiết bị thu hồi, phản hồi đến trễ.
- Test animation/responsive hiện có giữ nguyên kỳ vọng 950ms. Không kết luận đã thử trên điện thoại vật lý.

Log ứng dụng có `public.search.completed` và `http.completed` với request ID; không lưu từ khóa. Khi deploy, cấu hình access log proxy/web server bỏ query string và không bật debug query bindings. Không thêm SQL migration, không sửa dữ liệu MySQL trong đợt này.
