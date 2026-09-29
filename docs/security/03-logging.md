# Đặc tả log và audit

**Trạng thái:** thiết kế để triển khai cùng backend; chưa có logger PHP/Python chạy thật. “Đầy đủ” nghĩa là truy được sự kiện và kết quả, đồng thời hạn chế dữ liệu riêng tư.

## Các luồng log dự kiến

| Luồng | Vị trí phát triển | Nội dung |
|---|---|---|
| Ứng dụng Laravel | `backend/api/storage/logs/application-YYYY-MM-DD.log` | Lỗi vận hành, request, thời gian, phụ thuộc lỗi |
| Bảo mật Laravel | `backend/api/storage/logs/security-YYYY-MM-DD.log` | Đăng nhập/đăng xuất, reset, từ chối quyền, giới hạn tần suất |
| Audit quản trị | `backend/api/storage/logs/audit-YYYY-MM-DD.log` | Ai đổi vai trò/trạng thái, tạo/sửa/xóa/công bố tri thức, phiên bản liên quan |
| Dịch vụ AI | `backend/ai/logs/ai-YYYY-MM-DD.log` | Request ID, model/phiên bản chỉ mục, ID căn cứ, thời gian, số token/lỗi; không ghi nguyên câu hỏi |
| Web server | Theo cấu hình hosting ngoài public webroot | Route đã lọc, status, thời gian; không ghi query chứa token/email |

Dùng JSON Lines, UTF-8, UTC ISO-8601; đồng bộ đồng hồ máy. Laravel có thể cấu hình các channel dựa trên [logging của framework](https://laravel.com/framework/docs/13.x/logging); Python dùng structured logging tương thích schema. Khi container hóa, stdout đi vào collector có quyền truy cập và retention tương đương, không lưu file tạm trong image rồi mất khi restart.

## Trường được phép

- `timestamp`, `event_id` do server tạo, `level`, `service`, `environment`, `event`, `outcome`.
- `request_id` do Laravel sinh và truyền FastAPI; header client chỉ được dùng nếu đúng định dạng/độ dài hoặc thay bằng ID mới. Không dùng ID này để phân quyền.
- `actor_id`, `actor_role` từ phiên server; null khi chưa xác thực. Có thể dùng `subject_ref` dạng HMAC có khóa riêng cho email chưa đăng nhập, không ghi email thô hoặc hash dễ dò.
- `target_type`, `target_id`, `route` dạng tên/template, `method`, `status`, `duration_ms`, `error_code` từ danh mục đã định nghĩa.
- Metadata riêng sự kiện: tên trường thay đổi, vai trò/trạng thái cũ/mới, phiên bản nội dung, ID nguồn, model, token count. Chỉ nhận key đã allowlist; không tự serialize request/model/exception context.
- IP/User-Agent chỉ thu tối thiểu khi cần chống lạm dụng; User-Agent cắt độ dài. Chỉ tin forwarding header từ reverse proxy đã cấu hình. Log chia sẻ/báo cáo phải che dữ liệu định danh.

Ví dụ hư cấu, không phải log đã chạy:

```json
{"timestamp":"2026-09-29T08:30:00Z","event_id":"example-event-001","level":"info","service":"api","environment":"test","event":"admin.user.role_changed","outcome":"success","request_id":"example-request-001","actor_id":1001,"actor_role":"admin","target_type":"nguoi_dung","target_id":1002,"metadata":{"previous_role":"user","new_role":"admin"}}
```

## Sự kiện bắt buộc khi có chức năng

| Chức năng | Sự kiện/kết quả cần phân biệt |
|---|---|
| Auth | login success/failure/rate_limited; logout; session invalid/expired; account blocked |
| Quên mật khẩu | reset requested; mail queued/sent/failed; verification failed/expired/locked/succeeded; reset completed/replay rejected |
| Authorization | denied theo route/actor/target; không kèm nội dung tài nguyên bị từ chối |
| Quản trị | tạo/sửa/xóa/khóa tài khoản; đổi quyền; thay đổi/công bố/lưu trữ văn bản; index build/switch version |
| Upload | accepted/rejected/parser_failed/timeout theo ID file server, kích thước, reason code; không ghi nội dung tệp |
| AI | request started/completed/timeout/rejected; version mismatch/citation invalid/quota exceeded |
| Vận hành | DB/email/AI lỗi, logger/collector lỗi, đầy đĩa, backup/restore/deploy thất bại |

Ghi success sau khi nghiệp vụ thực sự hoàn thành. Audit thay quyền/công bố cần bản ghi bền vững gắn với giao dịch: dùng bản ghi audit trong cùng transaction DB rồi xuất file, hoặc cơ chế bảo đảm tương đương. DB đã có `nhat_ky_quan_tri` từ 30/09/2026; service ghi và exporter/retry chưa triển khai. Chỉ nối `Log::info` sau commit có thể mất sự kiện khi tiến trình chết, không được coi đã giải quyết tính nguyên tử. Nếu không lưu được audit bắt buộc thì rollback thao tác đặc quyền; tránh trả success rồi âm thầm mất dấu vết.

## Dữ liệu tuyệt đối không ghi

Mật khẩu và xác nhận mật khẩu; OTP (kể cả hash OTP), reset token/hash, cookie/session ID, Authorization header, CSRF token, API key/APP_KEY, chuỗi kết nối có mật khẩu; body chat riêng, toàn bộ hồ sơ hoặc PDF; URL query chứa thông tin cá nhân/token. Không dump SQL bindings của request nhạy cảm. Stack trace chỉ vào log lỗi nội bộ đã lọc, không trả client hoặc gửi nguyên trạng sang dịch vụ analytics.

Lọc theo allowlist trước khi serialize, che theo tên trường chỉ là lớp bổ sung. Escape CR/LF/control characters để mỗi event không giả được dòng log khác; cắt trường dài và giới hạn kích thước event (mốc khởi đầu 8KB, cấu hình khi triển khai). Tham khảo nguyên tắc [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

## Lưu giữ, bảo vệ và cảnh báo

- Mốc vận hành đề xuất: application/AI 14 ngày, security/audit 90 ngày, access có IP tối đa 7 ngày. Đây là lựa chọn kỹ thuật ban đầu, không phải khẳng định nghĩa vụ pháp lý; điều chỉnh theo dữ liệu/hosting.
- Rotate theo ngày **và** dung lượng (khởi đầu 50MB/file), đặt tổng quota theo dung lượng máy, cảnh báo trước khi đầy; xóa đúng hạn, kể cả bản export/collector. Chống spam log bằng gộp sự kiện lặp có count, không bỏ audit thay quyền/công bố.
- Log ngoài public webroot, Git bỏ qua; chỉ service được ghi, người vận hành được đọc. Tài khoản admin web không tự có quyền tải log chứa sự kiện của người khác.
- Bản audit đưa sang nơi lưu có hạn chế sửa/xóa độc lập với tiến trình web khi deploy. Backup/collector có kiểm soát truy cập; không chỉ dựa vào file writable bởi ứng dụng để phát hiện sửa dấu vết.
- Cảnh báo nhóm: nhiều lần đăng nhập/OTP sai, truy cập trái quyền hàng loạt, đổi quyền admin, tần suất mail/token bất thường, logger chết và disk gần đầy. Chọn ngưỡng theo tải thử; webhook/email cảnh báo lấy từ secrets. Viết kênh cảnh báo chưa chứng minh có người nhận: cần test nhận và người xử lý.
- Logger mất kết nối: buffer có giới hạn, báo lỗi vận hành; không tràn RAM hoặc in request thô làm fallback. Quyền/auth không được bỏ qua để tiếp tục. Phân biệt lỗi log đọc thông thường và audit bắt buộc cho thao tác đặc quyền.

## Test chấp nhận

Chèn chuỗi canary giả vào password, OTP, header, nested JSON và lỗi của dịch vụ ngoài; tìm trên cả file/collector/access/trace để xác nhận không còn chuỗi. Test CR/LF, trường quá dài, nhiều event đồng thời, restart/rotation/retention, quyền đọc file, collector lỗi/hết đĩa. Truy một request Laravel → Python bằng cùng `request_id`. Kiểm tra transaction thất bại không được ghi nghiệp vụ success và audit đã commit không mất sau restart. Không dùng secret thật làm canary.
