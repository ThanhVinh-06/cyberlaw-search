# Hướng dẫn cho agent làm việc trong CyberLaw Search

- Đọc `HANDOFF.md` trước khi tiếp tục dự án, sau đó đọc tài liệu liên quan đến phần đang làm. Nếu trạng thái đã thay đổi, ưu tiên yêu cầu mới của người dùng và mã thực tế.
- Trao đổi bằng tiếng Việt, xưng em/gọi anh. Giữ thiết kế đơn giản, phù hợp đồ án sinh viên.
- Frontend đã chốt React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Motion; đã có frontend React trong `frontend/src/`, chạy bằng `npm run dev` tại `frontend/`. Giữ sidebar trái trên desktop và ảnh robot AI của dự án.
- Trang chính giữ bố cục/phong cách bản cũ, đã chuyển React trong `frontend/src/MainSite.tsx`; chưa nâng cấp UI/UX trang chính. Đăng nhập/đăng ký dùng thiết kế mới.
- MySQL dùng tên bảng/cột tiếng Việt không dấu. Xem `database/schema.sql` và `docs/design/04-co-so-du-lieu.md`; không tự đổi về quy ước tên tiếng Anh.
- Backend theo hướng PHP cho nghiệp vụ và Python cho AI; Laravel/FastAPI được đề xuất nhưng chưa triển khai. Không báo các chức năng dự kiến là đã chạy thật.
- Kiểm tra `git status` và giữ các thay đổi hiện có. Không ghi mật khẩu, khóa API vào repository. Giữ nguyên PDF nguồn trong `data/raw/`.
- Skills frontend được người dùng đặt tại `.agent/skills/skills/`; đọc SKILL.md phù hợp khi cần, không clone lại hoặc sửa repo skills nếu không có yêu cầu.
- Mọi trang/tab thiết kế hoặc triển khai sau này mặc định có animation **Fade In Up** mượt mà, đồng bộ với các trang quản trị đã duyệt: nội dung xuất hiện nhẹ từ dưới lên, các khối nối tiếp nhau khi vào/chuyển trang. Tái sử dụng cách triển khai hiện có; không chạy lại khi gõ tìm kiếm hay cập nhật dữ liệu, không làm giật bố cục hoặc ảnh hưởng hover. Giữ hỗ trợ reduced motion và bàn phím. Đây là yêu cầu chung của người dùng, không cần hỏi lại cho từng trang.
- Cập nhật `HANDOFF.md` sau các thay đổi đáng kể để agent khác tiếp tục được.
