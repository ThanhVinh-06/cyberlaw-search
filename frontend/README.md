# CyberLaw — Frontend React

React + TypeScript + Vite + Tailwind CSS + shadcn/ui (Radix) + Motion for React.

## Chạy giao diện

Yêu cầu Node.js 22.12 trở lên (đã kiểm tra bằng Node 24.18). Từ thư mục frontend:

```powershell
npm ci
npm run dev
```

Mở http://127.0.0.1:5173/ cho trang chính; /login và /register cho tài khoản. Font được đóng gói cùng ứng dụng, không phụ thuộc Google Fonts lúc chạy. Cổng phát triển cố định 5173; nếu đã có server thì mở lại địa chỉ đang chạy.

## Đã có

- Đăng nhập `/login`, đăng ký `/register`: nhãn trường, autocomplete, hiện/ẩn mật khẩu, cảnh báo Caps Lock, kiểm tra dữ liệu khi rời trường/gửi form, đưa focus đến trường lỗi.
- Thông báo rõ đây là bản xem trước; gửi form hợp lệ không tạo tài khoản, không giả lập phiên đăng nhập, không gửi hoặc lưu mật khẩu. Mật khẩu được xóa sau kiểm tra hợp lệ và khi đổi trang.
- `/` và `/search`: giữ thiết kế trang chính cũ, chuyển thành React tại `src/MainSite.tsx`; bộ lọc từ khóa/số điều/loại nội dung/ngày, gợi ý, đặt lại và dialog căn cứ. `/library` giữ mục lục chọn điều khoản; `/terms` giữ thẻ thuật ngữ. Robot mở chat với hai phản hồi mẫu và liên kết căn cứ. `/help` giới thiệu phạm vi dự án.
- CSS trang chính nằm riêng trong `src/main-site.css`, dùng tiền tố `cl-` và `@scope` để không ảnh hưởng trang tài khoản. Bố cục chính sẽ nâng cấp UI/UX sau theo yêu cầu người dùng.
- Sidebar luôn hiện trên desktop. Trang chính giữ menu dạng lưới trên mobile; trang tài khoản dùng menu thu gọn có quản lý focus/Escape và robot ở cuối trang để không che form.
- Motion dùng opacity/transform 220 ms cho chuyển form; CSS phản hồi nút 160 ms. Chuyển bằng bàn phím là tức thì; hỗ trợ prefers-reduced-motion.
- Xem điều khoản: Antigravity đã chuyển thẻ kết quả/modal sang Motion shared layout với spring, nền mờ và nội dung hiện dần trong `src/components/ArticleDialog.tsx`. Các nút Xem điều khoản nằm giữa thẻ. Khi mở chat, tiêu đề thư viện ẩn không tham gia chung layoutId với kết quả/modal.
- Chat robot: `src/components/ChatPopover.tsx` dùng Motion shared layout cho nút/panel và avatar, tham khảo Feedback popover trên animations.dev. Mở rộng từ góc dưới phải và thu về nút với spring 0.5 s; nội dung hiện sau một nhịp ngắn. Đóng bằng Esc, nút X hoặc click ngoài; giữ câu hỏi đang soạn/tin nhắn khi mở lại. Hỗ trợ bàn phím, reduced motion và màn hình nhỏ. Robot trang tài khoản vẫn dùng thông báo cũ.
- Thư viện ảnh tại `public/assets/`; bản mẫu HTML/CSS/JS cũ được lưu trong `../experiments/archive/frontend-static/`.

## Kiểm tra

```powershell
npm run build
npm run format:check
npm run test:e2e
```

E2E dùng Playwright với Microsoft Edge đã cài trên Windows. Trên máy CI cần cung cấp Edge hoặc chỉnh channel phù hợp. 14 kịch bản kiểm tra tra cứu/bộ lọc ngày/thư viện/chat mẫu, form, mật khẩu, dữ liệu không bị gửi/lưu, dialog, focus, reduced motion, đóng/mở chat liên tục và responsive 320/390/768/1024/1440 px. Axe kiểm tra tự động các quy tắc WCAG A/AA trên hai trang ở 1440 và 390 px; không thay thế đánh giá tiếp cận thủ công toàn diện.

Ảnh kiểm tra được lưu trong `../docs/design/screenshots/`. Kết quả tạm và dependency đã được bỏ qua bởi Git.

## Giới hạn và bước tiếp theo

Chưa có API Laravel, tài khoản thật, phân quyền backend hoặc AI thật. Khi tích hợp, bổ sung trạng thái gửi request, lỗi 401/422/429, CSRF/session, chuyển hướng sau xác thực và kiểm tra quyền trên server. Quy tắc mật khẩu phía giao diện hiện là tối thiểu 8 ký tự; cần thống nhất với backend.

Component shadcn/ui được thêm bằng CLI, có điều chỉnh style theo CyberLaw. Các skill đã áp dụng: `.agent/skills/skills/emil-design-eng/` và `.agent/skills/skills/animate/`. Tài liệu thiết kế tài khoản: `../docs/requirements/02-tai-khoan-phan-quyen.md`.
