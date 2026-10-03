# Kiểm tra bảo mật sau từng chức năng

Chọn các hàng liên quan trong [danh mục rủi ro](01-risk-catalog.md), ghi PASS/FAIL/NOT RUN/N/A kèm bằng chứng vào [mẫu báo cáo](review-template.md). Test ở lớp thực thi kiểm soát: kiểm tra React không thay thế kiểm tra API. Không cần chạy lại mọi công cụ cho sửa chữ/CSS không đổi đường dữ liệu.

## Chuẩn bị chung

- Liệt kê route, phương thức, vai trò, chủ sở hữu dữ liệu, đầu vào và thay đổi DB/file/AI/email.
- Dùng database test riêng, tài khoản giả: khách, user A, user B, admin, tài khoản khóa. Không dùng email người thật, DB phát triển hoặc dịch vụ AI có phí để test hàng loạt.
- Đọc diff, dependency thay đổi và dữ liệu API trả về. Phân biệt giả thuyết với lỗi tái hiện được.
- Mỗi test từ chối phải chứng minh cả phản hồi đúng **và không có thay đổi/đọc dữ liệu trái phép**, không chỉ assert mã HTTP.

## Bộ ca theo chức năng

| Phần | Ca phải xét | Kết quả mong đợi |
|---|---|---|
| Đăng ký | Gửi thêm vai trò admin/chủ sở hữu; email trùng; field ngoài allowlist | Không tự nâng quyền; không lộ hash/secret; validation server |
| Đăng nhập | Sai tài khoản, sai mật khẩu, tài khoản khóa; nhiều lần thử | Lỗi chung không tiết lộ tài khoản, rate limit; mật khẩu giữ nguyên ký tự |
| Phiên | Thay sessionStorage, ID phiên cũ, tải lại/chuyển tab, hết hạn/logout | Quyền lấy từ server; ID phiên đổi khi login; phiên hết hiệu lực không được dùng |
| Cookie/CSRF | Thiếu/sai CSRF, origin lạ; HTTPS/cookie flags | Yêu cầu thay dữ liệu không hợp lệ bị chặn; HttpOnly/Secure/SameSite phù hợp |
| OTP | Email có/không tồn tại, mã sai/thiếu/hết hạn/gửi lại | Phản hồi không lộ email tồn tại; mã cũ vô hiệu; giới hạn gửi và lượt thử ở server |
| Reset | Token sai, sửa email sau xác minh, token đã dùng, hai request đồng thời | Không đổi tài khoản khác; tối đa một lần thành công; mật khẩu đã băm; vô hiệu phiên cũ theo thiết kế |
| Quản trị | Khách/user gọi trực tiếp route hoặc đổi HTTP method; trường nhạy cảm thừa | Kiểm tra quyền từng API; allowlist trường ghi và trường trả về |
| Vai trò | Khóa/hạ quyền/xóa admin hoạt động cuối cùng, yêu cầu đồng thời | Không làm mất admin cuối; sự kiện thay quyền có audit |
| Lịch sử | A lấy/xóa chat B; thay ID message/citation; admin xem chat riêng; khách gọi `/api/history*` | Kiểm tra chủ sở hữu xuyên quan hệ; không trả dữ liệu vượt quyền; khách 401 dù hội thoại khách vẫn được lưu |
| Văn bản | Đọc bản nháp qua ID, tải PDF chưa công bố; sửa/xóa nguồn có liên kết | Khách không thấy bản nháp; ràng buộc dữ liệu và phiên bản đúng |
| SQL/validation | Chuỗi đặc biệt trong search/sort/filter, enum sai, ID âm/quá lớn | Binding và allowlist sort; không thay nghĩa truy vấn, không rò SQL/stack |
| XSS | HTML/script thử trong tên, văn bản, AI/Markdown; URL giao thức lạ | Hiển thị như dữ liệu; liên kết không chạy script; không chèn raw HTML |
| Upload | File giả PDF, MIME/đuôi lệch, tên `../`, quá lớn, parser lỗi/quá lâu | Từ chối an toàn; không ghi ngoài storage, không thực thi, không để file dở công khai |
| URL fetch | Host nội bộ, DNS/redirect đổi sang mạng riêng, URL có thông tin đăng nhập | Chặn trước truy cập; nếu không hỗ trợ fetch thì N/A, không coi lọc href là chống SSRF |
| AI | Prompt injection trực tiếp/trong PDF, tài liệu sai phiên bản, citation bịa; **khách vãng lai** (không tài khoản) | Không tăng quyền/dùng tools; chỉ kho đã duyệt; kiểm tra nguồn và báo thiếu căn cứ. Khách là đối tượng hợp lệ: neo danh tính theo phiên trình duyệt, hạn mức riêng (session + IP), không đọc lịch sử. Hội thoại khách (`ma_nguoi_dung IS NULL`) **được** admin xem theo quyết định sản phẩm — xem `reviews/2026-10-02-khach-vang-lai-chat.md` (ngoại lệ của "admin không mặc nhiên đọc chat riêng", `README.md`); chat của người dùng đã đăng nhập khác vẫn chỉ chủ sở hữu xem |
| Tài nguyên | Payload lớn, quá nhiều kết quả/token, đồng thời, timeout, request lặp | Giới hạn ở server; không tăng phí/ghi trùng vô hạn; lỗi rõ và phục hồi được |
| Lỗi | MySQL/email/AI mất kết nối, transaction lỗi giữa chừng | Không lưu trạng thái thành công giả; rollback hợp lý, không trả bí mật |
| Log | Bí mật lồng JSON/header/exception, ký tự xuống dòng, hết dung lượng | Che bí mật; một JSON/event; rotation/cảnh báo hoạt động; không bỏ qua quyền |
| UI | Loading/error/422/401/403/429 và thao tác bàn phím/cảm ứng | Không để form gửi lặp; responsive 320px/440px/iPad/desktop/landscape |

## Công cụ và điều kiện chạy

| Kiểm tra | Cách dùng | Thời điểm |
|---|---|---|
| Review | Diff + truy vết từ input đến SQL/file/HTML/AI/log | Mỗi chức năng; ghi N/A có lý do nếu chỉ sửa tài liệu |
| NPM | Tại `frontend`: `npm.cmd audit --json`; Linux dùng `npm audit --json` | Khi đổi dependency và trước release; xét cả dev dependency trong pipeline build |
| PHP | Tại `backend/api`: `composer audit --locked --format=json` | Sau khi có Composer/lockfile; không chạy vào thư mục chưa khởi tạo |
| Python | `python -m pip_audit -r requirements.txt` trong môi trường riêng, với tệp phiên bản đã khóa thật | Khi dịch vụ Python có dependency và công cụ đã cài; chưa có thì NOT RUN |
| Secrets | Gitleaks quét worktree và lịch sử, bật che kết quả; kiểm tra thủ công báo cáo | Trước push/release và khi thay cấu hình; không in secret lên chat/CI |
| SAST | Công cụ/rules PHP, TS, Python phù hợp phiên bản đã cài, cộng review thủ công | Code đổi ở biên tin cậy; ghi tool/rule/version; thiếu tool thì NOT RUN |
| API | Test Laravel/Python với fixture độc lập; ca hợp lệ, trái quyền và đồng thời | Mỗi chức năng liên quan API, không chờ frontend |
| DAST | ZAP baseline trên local/staging có phạm vi; test auth theo vai trò | Khi có server thật. Baseline vẫn crawl/gửi request; active scan chỉ dùng môi trường được phép |
| Browser | Playwright hiện có và test responsive phần bị ảnh hưởng | Mỗi chức năng giao diện; không gọi đây là kiểm thử xâm nhập toàn bộ |

Nguồn công cụ: [Composer audit](https://getcomposer.org/doc/03-cli.md#audit), [pip-audit](https://github.com/pypa/pip-audit), [Gitleaks](https://github.com/gitleaks/gitleaks), [ZAP baseline](https://www.zaproxy.org/docs/docker/baseline-scan/). Xác nhận flags/phiên bản trước khi dùng. Không chạy `audit fix --force`, thêm ignore hoặc nâng major chỉ để làm báo cáo xanh.

Report thô lưu ở `tmp/security/` hoặc `reports/security/raw/` (Git bỏ qua). Chỉ commit tóm tắt đã che dữ liệu. Nếu scanner lỗi mạng/không chạy, ghi đúng trạng thái; kết quả không có advisory không chứng minh không có lỗi logic.
