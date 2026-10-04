# Kiểm tra hỏi đáp gần đây — 04/10/2026

- Đọc metadata MySQL, không xuất body chat: 15 assistant messages; truy vấn controller cho admin trả 5 mục, bao gồm 3 mục mới nhất hôm nay. Không thay đổi dữ liệu thật.
- Người dùng đã làm rõ qua ảnh: tổng 15 đã cập nhật, yêu cầu tăng danh sách từ 5 lên tối đa 10. Đổi duy nhất giới hạn truy vấn `recentQuestions()` thành 10, giữ thứ tự ID giảm dần, bộ lọc kỳ và ownership; tổng số lượt vẫn độc lập với giới hạn danh sách. localhost và 127.0.0.1 phục vụ cùng mã hiện tại; listener 5173/8000 thuộc Vite/Laravel của workspace.
- Sửa thiếu cập nhật khi trở lại browser tab: focus/visibilitychange tải lại số liệu, giữ card khi đang chờ, không replay skeleton/Fade In Up. Không thay CSS, markup, timing hay quyền đọc.
- PHPUnit AdminStatisticsTest sau tăng giới hạn: 9/9, 79 assertions; regression 13 lượt trả đúng 10 ID mới nhất và đúng cặp câu hỏi, cả 3 kỳ. Test reload mới nhất và không rò chat của user khác PASS. LocalAnswerTest đã chạy cùng suite thống kê cũ: 19/19, 135 assertions.
- Playwright thống kê/responsive chạy lại sau thay đổi: 26/26, gồm focus refresh và reload từ `/admin`. Các mốc 320/440/834/900/901/956/1024/1440, gồm landscape; fixture UI, không phải HTTP thật hay thiết bị vật lý.
- Sau tăng giới hạn, thêm 5/5 test PASS với 10 box tại 320x740, 440x956, 834x1112, 1440x1000, 956x440: không tràn ngang, mở/đóng chi tiết box cuối và trả focus đúng. Không đổi CSS/markup/timing; các test dùng API fixture và trình duyệt giả lập.
- Production build PASS (cảnh báo chunk >500kB có sẵn). Backend query/CSRF/ownership không thay đổi.

## Hiển thị giờ Việt Nam

- Đọc metadata bản ghi gần nhất và cấu hình runtime xác nhận PHP/Laravel UTC; giờ lưu 11:22:55 tương ứng 18:22:55 Việt Nam ngày 04/10/2026. Không xuất nội dung chat hoặc sửa DB thật.
- Chỉ chuyển nhãn `thoi_gian` trong response thống kê sang Asia/Ho_Chi_Minh và thêm tooltip múi giờ. Không đổi giờ lưu, cấu hình UTC, bộ lọc kỳ, thứ tự hay quyền đọc.
- PHPUnit AdminStatisticsTest 10/10, 85 assertions PASS: đổi UTC sang Việt Nam gồm trường hợp qua ngày mới, DB giữ nguyên UTC; các ca phân quyền/không lộ chat riêng vẫn PASS. Không thêm dependency, đầu vào, quyền hoặc log nội dung chat.
- Playwright với chuỗi giờ Việt Nam và tooltip: 5/5 PASS tại 320/440/834/1440 và 956x440; kiểm tra không tràn ngang, mở/đóng dialog và focus box cuối. Đây là responsive giả lập dùng API fixture.

## Kiểm tra trước commit tạm dừng phát triển

- Chạy lại AdminStatisticsTest + LocalAnswerTest: 22/22 PASS, 173 assertions, dùng database test riêng.
- Chạy lại admin-stats + admin-responsive: 31/31 PASS, gồm animation, layout shift, 10 box, modal, reduced motion và các mốc đổi bố cục. Kiểm tra giả lập, không phải thiết bị thật.
- Frontend build và typecheck:e2e PASS; cảnh báo chunk lớn có sẵn. git diff --check PASS.
- Rà danh sách file và quét mẫu secret trong các file thay đổi: 0 mẫu khóa riêng/API key phổ biến; không có env, database/dump, log hay dữ liệu riêng trong phạm vi commit. Đây là kiểm tra mẫu và review diff, không phải chứng nhận không có secret. Gitleaks không có trong PATH; quét lịch sử bằng công cụ chuyên dụng NOT RUN.
- Không đổi dependency hoặc lockfile; không chạy lại dependency audit ở lượt này. Đây là checkpoint Git phục vụ báo cáo, không phải release/deploy production.
