# Kiểm tra trước deploy

Áp dụng khi có backend và đích deploy đã chọn. Hiện chưa có môi trường production được cấu hình; không đánh dấu các ô đạt trước khi kiểm thử.

- [ ] Tách development/test/staging/production; không dùng dữ liệu người thật làm fixture. Hạ tầng có phiên bản PHP/Python/framework được hỗ trợ, dependency có lockfile.
- [ ] Auth demo, nút điền tài khoản mẫu và mã OTP trên màn hình không có trong bản production. Quyền được kiểm tra tại Laravel; test gọi API trực tiếp và thay sessionStorage.
- [ ] HTTPS hoạt động; cookie Secure/HttpOnly/SameSite đúng, CSRF đúng. Test phiên qua reload/chuyển tab, logout, reset mật khẩu và khóa tài khoản.
- [ ] Webroot chỉ gồm frontend build và `backend/api/public`; `.git`, `.env`, log, backup, source/model riêng không tải được. Không public Vite dev server, MySQL, FastAPI nội bộ hoặc Swagger/debug không cần thiết.
- [ ] `APP_DEBUG=false`; lỗi client không có stack/SQL/secret. Host/CORS/trusted proxy là allowlist; không wildcard credentials. Headers kiểm tra theo server thực: CSP, frame-ancestors, nosniff, Referrer-Policy. CSP được thử với Motion/font/PDF/chat trước khi bật chặn; HSTS chỉ bật sau khi HTTPS/domain đáp ứng.
- [ ] Tài khoản MySQL của app có quyền tối thiểu, không dùng root; tài khoản migration riêng nếu cần. Secrets được cấp ngoài Git/frontend; có kế hoạch đổi khóa khi lộ và bảo vệ backup. Lộ secret phải thu hồi/đổi khóa, xóa khỏi code là chưa đủ.
- [ ] API có giới hạn theo tác vụ (login/OTP/upload/chat), body/page/file/time/concurrency/token/cost. Kiểm tra IP proxy; có fallback khi AI lỗi. Không chạy test làm ngập dịch vụ thật.
- [ ] Upload nằm ngoài webroot, quyền thực thi tắt, parser bị giới hạn, chỉ nguồn đã duyệt mới được công bố/lập chỉ mục. Không truy cập URL nội bộ qua fetch.
- [ ] Log theo [đặc tả](03-logging.md), không ghi dữ liệu cấm; audit bền vững, rotation/quota/retention đúng, cảnh báo đã nhận được và có người xử lý.
- [ ] Backup DB và nguồn cần thiết được bảo vệ; phục hồi thử vào DB riêng thành công. Migration có kế hoạch rollback/phục hồi; không chạy `migrate:fresh` trên dữ liệu đang dùng.
- [ ] Luật 2025/citation/chỉ mục cùng phiên bản; phản hồi AI không tạo quyền hoặc nội dung thực thi; thiếu căn cứ có trạng thái rõ ràng. Không đưa dữ liệu mẫu 2018/giả vào production.
- [ ] Sau `cyberlaw:import-knowledge --apply`, **công bố văn bản trên trang quản trị** (bundle ghim `draft`/v1 nên API công khai vẫn rỗng/409 tới khi `published`). Xác nhận `/api/search`, `/api/library`, `/api/terms` trả đúng Luật 116/2025/QH15 trước khi mở. Nếu `cyberlaw:import-knowledge` báo `knowledge_existing_conflict` trên DB đã công bố thì đó là fail-closed đúng thiết kế, không phải sự cố — chi tiết ở [tài liệu dữ liệu](../data/01-du-lieu-luat-116.md) mục 6.
- [ ] Dependency audit, secret scan worktree/lịch sử, review/SAST và test API đạt trong phạm vi. DAST trên staging có quyền thực hiện, bao phủ vai trò liên quan. Kết quả NOT RUN hoặc phát hiện chưa xử lý được ghi rõ.
- [ ] UI kết nối API được test responsive, bàn phím, loading/error, expiry và rate-limit; không log body nhạy cảm từ frontend analytics.
- [ ] Không còn High/Critical đã xác nhận. Vấn đề còn lại có người chịu trách nhiệm/kế hoạch. Ghi commit, config, thời điểm và bằng chứng release. Không dùng câu “không có lỗ hổng” làm kết luận thay cho phạm vi kiểm tra.

## Khi thêm CI

Chạy test và audit trên pull request/nhánh deploy; test dùng DB riêng. Không cấp production secrets cho PR không tin cậy; quyền token tối thiểu; workflow/action có revision kiểm soát. Report thô có thể chứa dữ liệu nhạy cảm nên hạn chế truy cập và thời gian lưu. Thiết lập branch protection khi repo/quyền hỗ trợ; checklist này chưa tự bật CI hoặc nhánh bảo vệ.

Nếu phát hiện sự cố sau deploy: ngừng chức năng bị ảnh hưởng khi cần, thu hồi secret/phiên liên quan, giữ log có quyền truy cập để điều tra, sửa và retest, phục hồi có kiểm chứng. Không xóa log để làm mất cảnh báo.
