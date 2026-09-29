# Danh mục rủi ro và cách áp dụng

Đối chiếu 29/09/2026. Đây là **nhóm cần kiểm tra**, không phải kết luận CyberLaw có tất cả các lỗi. Mã `CL-*` dùng nội bộ để nối test/báo cáo.

## Web: OWASP 2025

Tên nhóm tóm tắt từ [OWASP Top 10:2025](https://top10.owasp.org/2025/); cột áp dụng là thiết kế riêng của dự án.

| OWASP | Mã | Rủi ro | Áp dụng cho CyberLaw |
|---|---|---|---|
| A01 | CL-01 | Kiểm soát truy cập sai | Policies kiểm tra vai trò/chủ sở hữu mỗi API; test sửa ID chat, gọi admin bằng user, đọc bản nháp |
| A02 | CL-02 | Cấu hình không an toàn | Tắt debug; chặn `.env`, log, backup; chỉ public đúng webroot; CORS/proxy/cookie rõ ràng |
| A03 | CL-03 | Chuỗi cung ứng | Lockfile, nguồn package/model, audit dependency trực tiếp/gián tiếp, review script cài đặt và CI |
| A04 | CL-04 | Bảo vệ mật mã sai | Hash mật khẩu, HTTPS, bí mật ngoài Git, token ngẫu nhiên; không tự viết mật mã |
| A05 | CL-05 | Chèn mã vào lệnh | SQL binding; escape HTML; không shell từ câu hỏi/tên PDF; không deserialize dữ liệu tùy ý |
| A06 | CL-06 | Thiếu kiểm soát trong thiết kế | Reset một lần kể cả đồng thời; bảo vệ admin cuối; duyệt nội dung; hạn mức email/AI |
| A07 | CL-07 | Xác thực và phiên sai | Auth server, đổi ID phiên, logout hết hiệu lực, chặn tài khoản khóa, không tin sessionStorage |
| A08 | CL-08 | Tính toàn vẹn dữ liệu/phần mềm | Hash PDF/model, phiên bản chỉ mục, validate kết quả AI; quyền cập nhật/công bố tri thức |
| A09 | CL-09 | Thiếu log/cảnh báo | Sự kiện auth, thay quyền, công bố, lỗi; che bí mật; kiểm tra cảnh báo và quyền đọc log |
| A10 | CL-10 | Xử lý lỗi bất thường sai | Rollback, timeout/hết đĩa/AI hỏng; không lộ stack trace hoặc bỏ qua quyền khi lỗi |

## API: OWASP 2023

Đối chiếu [API Security](https://api-security.owasp.org/editions/2023/en/0x11-t10/); test qua HTTP khi API tồn tại.

| API | Ca áp dụng |
|---|---|
| API1 | Sửa ID chat/tin nhắn/citation không đọc/xóa dữ liệu người khác (CL-01) |
| API2 | Phiên hết hạn, token sai, tài khoản khóa không được gọi API (CL-07) |
| API3 | Không sửa vai trò/chủ sở hữu ngoài allowlist; không trả mật khẩu/OTP (CL-01, CL-04) |
| API4 | Giới hạn payload, phân trang, file, đồng thời và thời gian chạy (CL-06) |
| API5 | User biết URL vẫn không gọi được chức năng admin (CL-01) |
| API6 | Chống gửi mã/tạo tài khoản/hỏi AI hàng loạt; không chỉ giới hạn theo một IP (CL-06) |
| API7 | URL fetch không truy cập localhost, mạng riêng, metadata; xét DNS/redirect (CL-11) |
| API8 | CORS, trusted proxy, header, debug và dịch vụ nội bộ (CL-02) |
| API9 | Danh sách route/version; gỡ endpoint demo/debug/bản cũ (CL-02) |
| API10 | Kiểm tra schema/kích thước/nguồn của phản hồi FastAPI và dịch vụ khác (CL-08, CL-10) |

## Các trường hợp cụ thể

| Mã | Kiểm soát | Kiểm tra |
|---|---|---|
| CL-11 | SSRF và đường dẫn | Chặn URL nội bộ/redirect nếu có fetch; `../` không đọc/ghi ngoài thư mục; bản đầu không fetch URL tùy ý |
| CL-12 | CSRF/CORS/clickjacking | POST thiếu/sai CSRF bị chặn; origin lạ không dùng credentials; frame-ancestors đúng |
| CL-13 | XSS và liên kết | Tên, văn bản, Markdown, AI output hiển thị mã thử như dữ liệu; chặn giao thức nguy hiểm và raw HTML tùy ý |
| CL-14 | Upload/parser PDF | Kiểm tra MIME/đuôi/nội dung/kích thước; parser giới hạn quyền/thời gian; lưu ngoài webroot; tên server sinh |
| CL-15 | Đua tranh/gửi lặp | Hai yêu cầu reset cùng token chỉ một thành công; đếm lỗi nguyên tử; retry không tạo dữ liệu/phí trùng |
| CL-16 | Rò dữ liệu | API, bundle, log, exception, export, ảnh và report không chứa mật khẩu/token/body chat riêng |

Upload tham khảo [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html); OTP tham khảo [Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). PDF hợp định dạng chưa chứng minh nội dung đáng tin: đưa vào khu chờ duyệt, không tự tải tài nguyên nhúng.

## AI/RAG (CL-17)

Đối chiếu [OWASP LLM Top 10:2025](https://genai.owasp.org/llm-top-10/). Test khi có AI thật, không đánh dấu đạt từ UI chat mẫu.

| Nhóm | Quy tắc riêng cho dự án |
|---|---|
| LLM01 | Câu hỏi/PDF có lệnh “bỏ qua quy tắc” không được đổi quyền hoặc dùng công cụ |
| LLM02 | Không gửi bí mật/chat người khác sang model |
| LLM03 | Model/thư viện có nguồn/revision; không chạy mã tải từ model tùy ý |
| LLM04 | Kho đã duyệt, có hash/phiên bản; không đưa upload thẳng vào kho công bố |
| LLM05 | Kiểm tra đầu ra, escape; không chạy SQL/HTML/lệnh do model tạo |
| LLM06 | AI bản đầu chỉ đọc tri thức, không sửa tài khoản/file hoặc gửi email |
| LLM07 | Prompt không chứa secrets và không quyết định quyền |
| LLM08 | Lọc nguồn được công bố, phạm vi 2025, chỉ mục cùng phiên bản |
| LLM09 | Citation tồn tại và hỗ trợ câu trả lời; thiếu căn cứ phải báo rõ; đo bằng QA đã duyệt |
| LLM10 | Giới hạn token, câu hỏi, thời gian, đồng thời, ngân sách; có hủy/giảm tải |

Lọc từ khóa trong prompt không đủ bảo vệ RAG. Quyền dữ liệu/công cụ phải được giới hạn ở server. Cập nhật danh mục khi phát hiện đường tấn công/advisory liên quan; không xem đây là danh sách đầy đủ mọi lỗ hổng.
