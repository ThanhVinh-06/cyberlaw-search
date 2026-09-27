# Bàn giao dự án CyberLaw Search

Cập nhật ngày 27/09/2026: đã chuyển frontend sang React và thiết kế trang đăng ký/đăng nhập; database tiếng Việt giữ nguyên.

Tài liệu này giúp agent mới tiếp tục dự án mà không cần lịch sử chat. Đây là trạng thái tại thời điểm bàn giao; kiểm tra mã và yêu cầu mới của người dùng trước khi thực hiện công việc tiếp theo.

## 1. Mục tiêu và cách làm việc

- Đồ án môn Trí tuệ nhân tạo, đề tài số 4: **Xây dựng hệ thống tra cứu kiến thức pháp luật về Luật An ninh mạng**.
- Người dùng muốn làm giao diện trước, sau đó kết nối backend và AI. Thiết kế vừa sức đồ án, dễ hiểu, không cầu kỳ.
- Trao đổi bằng tiếng Việt, xưng em và gọi người dùng là anh. Giải thích ngắn, rõ phần đã chạy thật và phần đang đề xuất.
- Workspace hiện tại: thư mục gốc dự án, Windows, PowerShell.
- Tài liệu gốc do người dùng cung cấp: thư mục đồ án trên máy người dùng. Các tài liệu cần thiết đã được sao chép vào dự án; không cần tổ chức lại từ đầu.

## 2. Quyết định đã trao đổi

| Phần | Quyết định / hướng thực hiện | Trạng thái thực tế |
|---|---|---|
| Frontend | Đã chốt React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Motion for React | Đã triển khai tại frontend/src; có package.json và lockfile |
| Backend | Người dùng muốn PHP kết hợp Python; đề xuất Laravel cho nghiệp vụ, FastAPI cho AI | Chưa khởi tạo Laravel/FastAPI chạy được |
| Database | Người dùng chọn MySQL; yêu cầu tên bảng và cột tiếng Việt không dấu | Đã tạo và kiểm tra trên MySQL 8.0.44 |
| Tài khoản | Có đăng ký, đăng nhập, đăng xuất và phân quyền | Có giao diện và kiểm tra dữ liệu nhập; chưa nối API xác thực |
| Phân quyền | Hai vai trò tài khoản user/admin; khách chưa đăng nhập | Chính sách chi tiết là đề xuất trong tài liệu |
| AI | Keyphrase, khái niệm, quy định có cấu trúc, tìm kiếm ngữ nghĩa và đáp án có căn cứ | Chưa triển khai; chưa chốt nhà cung cấp LLM/embedding |

Luồng kiến trúc đề xuất: `React → Laravel → FastAPI`, Laravel quản lý MySQL; Python xử lý tri thức và chỉ mục tìm kiếm. Giữ cách triển khai đơn giản trên cùng máy ở giai đoạn đầu.

## 3. Giao diện cần giữ

- Popup robot ở `/login` và `/register` đã chuyển từ Dialog giữa màn hình sang `ChatPopover` dùng chung với trang chủ: shared layout, spring 0.5 s/bounce 0.1, mở rộng từ launcher và thu về khi đóng. Tách CSS phần khung chat sang `frontend/src/components/ChatPopover.css` với scope riêng; giữ nội dung thông báo AI đang hoàn thiện và liên kết tra cứu trên trang tài khoản. Hỗ trợ Esc, click ngoài, trả focus, reduced motion, đóng khi đổi route. Mobile đặt launcher ở cuối trang để không che form, popup mở cố định trong viewport. Đã build thành công và đạt 11 kiểm tra Playwright trong auth/chat-popover, gồm 2 kiểm tra mới cho popup tài khoản; đã xem ảnh desktop/mobile. Thay đổi này được đưa vào đợt commit giao diện tài khoản cùng các chỉnh sửa sidebar theo yêu cầu của người dùng; đối chiếu HEAD với origin/main để xác nhận push.

- Nút Đăng nhập cuối sidebar dùng nền đỏ, chữ trắng và bo góc cùng class `cl-primary` với nút Tìm kiếm; thu gọn nhẹ với min-height 40px, padding 8px 16px theo yêu cầu. Đăng ký giữ dạng liên kết.

- Yêu cầu mới: chuyển Đăng nhập/Đăng ký từ thanh breadcrumb xuống cuối sidebar trái, thay vị trí nhãn “Bản thiết kế giao diện” đã bỏ. Mobile giữ hai liên kết ngay dưới nhóm menu (ẩn phần mô tả đồ án để gọn). Chỉnh tại MainSite.tsx và main-site.css; được đưa vào cùng đợt commit popup tài khoản.
- Người dùng đã duyệt animation điều khoản/chat và yêu cầu commit/push lên GitHub. Đã xóa `.kilo` theo yêu cầu: nó chỉ chứa worktree phụ `pickle-purple` sạch ở commit `ddb4c9f`, không có file sửa/ignored cần giữ hoặc tiến trình dùng đường dẫn đó. Gỡ bằng `git worktree remove`, sau đó xóa thư mục `.kilo`; thêm `.kilo/` vào `.gitignore`. Không ảnh hưởng frontend/backend/database hoặc skills trong `.agent`. Khi tiếp tục, đối chiếu HEAD với origin/main để kiểm tra đồng bộ.
- Cập nhật chat robot theo yêu cầu mới: đã đọc và giữ phần Motion shared layout của Antigravity trong `ArticleDialog.tsx`. Chat trang chính dùng component mới `frontend/src/components/ChatPopover.tsx`, tham khảo Feedback popover ở Module 3 trên animations.dev. Nút robot dạng khối bo góc và panel dùng chung layoutId trong LayoutGroup riêng; robot cũng có layoutId riêng để chuyển vào header. Spring duration 0.5 s, bounce 0.1; phần nội dung xuất hiện sau 120 ms. Popup mở rộng lên trên từ góc dưới phải và thu về nút, không dùng hidden để bật/tắt đột ngột. Motion chỉ nội suy transform/opacity và bù bo góc qua shared layout.
- Chat hỗ trợ Esc/nút đóng/click ngoài, trả focus khi đóng chủ động; click ngoài giữ focus tại phần vừa bấm. Câu hỏi đang soạn và tin nhắn mẫu vẫn còn khi mở lại. Popup không khóa trang như modal; khi mở căn cứ từ chat, popup chat vẫn giữ nguyên. Bàn phím bỏ morph, reduced motion dùng fade 160 ms. Responsive đã kiểm tra 390×844, 320×568, 844×390 và desktop. Chưa có API AI thật. Robot trên trang tài khoản đã được cập nhật ở đợt tiếp theo, xem ghi chú đầu mục này.
- Đã giới hạn layoutId tiêu đề điều khoản vào cặp thẻ kết quả/modal; tiêu đề trong thư viện ẩn không dùng chung ID nữa để tránh mất chữ khi chat làm trang render lại. File `ArticleDialog.tsx` của Antigravity giữ nguyên (SHA-256 B50E9DF28546307E31BFD032B920CFAD178A287898EF8E6C6D3C81A9E55ECC68). Bộ kiểm tra hiện có 14 kịch bản, gồm 3 kịch bản mới trong `frontend/e2e/chat-popover.spec.ts`; đã đạt, các kịch bản liên quan được chạy lại sau sửa layoutId. Các thay đổi animation/chat trang chủ đã push ở commit bd39b54.
- Cập nhật animation điều khoản: thiết kế lại chuẩn theo triết lý và ví dụ mẫu tại Module 04 "Good vs Great animations" trên https://animations.dev/ (mẫu App Store Card Expansion / Shared Layout bằng Motion). Thẻ kết quả tra cứu chuyển thành `<motion.article layoutId={`article-card-${article.id}`}>`, tiêu đề `<motion.h3 layoutId={`article-title-${article.id}`}>`. Khi bấm "Xem điều khoản", thẻ gốc phóng lớn và biến hình mượt mà thành modal dialog căn cứ giữa màn hình với spring physics (`stiffness: 190, damping: 25, mass: 0.85`), tạo cảm giác chuyển động êm, chậm và mượt mà ("đẹp chậm, và mượt mà"). Backdrop làm mờ sâu chuẩn frosted glass (`backdrop-filter: blur(14px) saturate(180%)`) kết hợp sắc độ burgundy ấm (`rgba(22, 10, 17, 0.68)`). Nội dung căn cứ pháp lý hiện dần với độ trễ nhẹ (`y: 14 -> 0, opacity: 0 -> 1, delay: 0.12s`). Khi đóng bằng nút X, bấm ra nền hoặc phím Escape, modal thu nhỏ và hạ cánh mượt mà trở lại đúng vị trí thẻ kết quả ban đầu, trả focus về nút kích hoạt và khôi phục thanh cuộn trang.
- Hỗ trợ trợ năng và phím: người dùng bật `prefers-reduced-motion` được chuyển sang hiệu ứng crossfade nhẹ 160 ms không dịch chuyển vị trí. Phím Tab được giữ trong phạm vi modal (focus trap). Khi mở từ chat AI hoặc thư viện, modal xuất hiện êm từ trung tâm với cùng thông số spring. Toàn bộ 11 kịch bản kiểm thử Playwright (`npm run test:e2e`) đều đạt. Build và format Prettier đạt chuẩn.
- Tham khảo ban đầu: https://bocongan.gov.vn/tim-kiem?search=an+ninh+mang&searchTypeId=title
- Nhận diện riêng CyberLaw Search: đỏ burgundy, vàng nhạt, nền sáng, chữ tiếng Việt dễ đọc.
- Sidebar luôn hiển thị bên trái trên desktop; bố cục responsive trên màn hình nhỏ.
- Thay nhân vật cán bộ ở mẫu tham khảo bằng robot AI làm nút mở chat.
- Người dùng muốn animation mượt, UI/UX đẹp. Hỗ trợ bàn phím và tùy chọn giảm chuyển động.
- Ảnh robot đã có: `frontend/assets/ai-assistant.png`; ưu tiên tái sử dụng.
- Yêu cầu mới nhất: giữ bố cục/phong cách trang chính cũ, chỉ chuyển sang React; nâng cấp UI/UX trang chính để giai đoạn sau. Hai trang đăng ký/đăng nhập dùng thiết kế mới.
- Frontend đang chạy: `frontend/src/App.tsx` (tài khoản), `frontend/src/MainSite.tsx` (trang chính), `frontend/src/index.css`, `frontend/src/main-site.css`, `frontend/src/components/ui/`. Entry là `frontend/index.html` và `frontend/src/main.tsx`.
- Đã có `/` và `/search` là trang tra cứu cũ chuyển sang React, cùng `/login`, `/register`, `/library`, `/terms`, `/help`. Trang chính giữ bộ lọc loại nội dung/ngày/số điều, thư viện có mục lục, thuật ngữ và dialog căn cứ. Robot trên trang chính mở chat có hai phản hồi mẫu cùng liên kết điều khoản; robot tại trang tài khoản mở thông báo AI chưa sẵn sàng. Chưa kết nối database/API. Form không gửi/lưu mật khẩu và không giả lập đăng nhập thành công.
- Form và thiết kế mục tiêu: `docs/design/03-dac-ta-form.md`. Prompt Stitch: `docs/prompts/04-prompt-stitch.md`.
- Các yêu cầu bổ sung về trang tài khoản/quản trị nằm trong `docs/requirements/02-tai-khoan-phan-quyen.md`.

Xem bản mẫu từ thư mục gốc:

```powershell
cd frontend
npm ci
npm run dev
```

Mở `http://127.0.0.1:5173/` cho trang chính, `/login` hoặc `/register` cho tài khoản. Kiểm tra cổng trước khi khởi động vì có thể đã có Vite chạy; không giả định phiên của agent trước còn hoạt động. Python launcher cũ nay khởi động Vite; thêm `--legacy --port 4173` để xem bản HTML đã lưu trong `experiments/archive/frontend-static/`.

Kiểm tra: `npm run build`, `npm run format:check`, `npm run test:e2e` (Playwright dùng Edge trên Windows). Có 8 kịch bản đã đạt: form/login, register, guest/source dialog, menu mobile, responsive/Axe, keyboard/reduced motion, luồng tra cứu/thư viện/chat, responsive trang chính. Axe chỉ áp dụng hai trang tài khoản. Trang chính dùng CSS riêng có tiền tố cl- và @scope để không ảnh hưởng CSS tài khoản; đã kiểm tra bằng Edge hiện hành. Font được đóng gói local. Ảnh desktop/mobile trong `docs/design/screenshots/`.

Skills đã đọc và áp dụng: `emil-design-eng`, `animate`, recipe về nút/chuyển động; shadcn/ui được thêm qua CLI. Motion dùng transform/opacity 220 ms, CSS phản hồi nút 160 ms, hỗ trợ giảm chuyển động và bỏ chuyển động khi dùng bàn phím.

## 4. Database hiện tại — phần vừa hoàn thành

- Database: `cyberlaw_search`; máy chủ local `127.0.0.1:3306`, tài khoản đã dùng là `root`.
- MySQL Server 8.0.44; service đã quan sát là `MYSQL80`. Người dùng có MySQL Workbench.
- CLI đã dùng: `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe` và `mysqldump.exe`.
- Mật khẩu đã được người dùng cung cấp riêng trong chat cũ, **không lưu trong tệp bàn giao, SQL hay repository**. Nếu công việc mới cần kết nối, dùng thông tin xác thực được cấp trong phiên mới.
- Đã đổi **9 bảng, 79 cột** sang tiếng Việt không dấu; tên khóa/index và chú thích cũng đã cập nhật.

| Bảng | Chức năng |
|---|---|
| `nguoi_dung` | Tài khoản, mật khẩu băm, vai trò và trạng thái |
| `van_ban` | Số hiệu, tiêu đề, ngày hiệu lực, nguồn và phiên bản nội dung |
| `dieu_khoan` | Nội dung chương/điều/khoản/điểm để tra cứu |
| `tu_khoa` | Cụm từ, biến thể và định nghĩa có căn cứ |
| `dieu_khoan_tu_khoa` | Liên kết điều khoản với từ khóa |
| `quy_dinh` | Chủ thể, hành vi, đối tượng, điều kiện, ngoại lệ và nguồn |
| `hoi_thoai` | Hội thoại thuộc người dùng |
| `tin_nhan` | Câu hỏi và câu trả lời |
| `trich_dan` | Bản chụp căn cứ gắn với câu trả lời |

- Tên khóa chính dạng `ma_nguoi_dung`, `ma_van_ban`…; thời gian là `ngay_tao`, `ngay_cap_nhat`.
- ENUM vẫn giữ giá trị kỹ thuật như `user/admin`, `active/blocked`, `draft/published/archived`, `user/assistant`; tài liệu giải thích nghĩa tiếng Việt.
- Có 9 khóa ngoại, 12 CHECK, 5 khóa duy nhất. Kết quả 11 kiểm tra sau đổi tên nằm trong `database/verification.json`.
- Tất cả bảng **đang rỗng tại thời điểm bàn giao**; dữ liệu kiểm tra đã rollback, AUTO_INCREMENT đã đặt lại 1. Chưa nhập luật hoặc tạo tài khoản.
- File nguồn: `database/schema.sql`. File xuất thực tế bằng mysqldump: `database/cyberlaw_search.sql`.
- Bản đã giao trên Desktop: `Desktop/cyberlaw_search.sql` trên máy người dùng.
- Hai bản dump đã so khớp SHA-256: `99EA79811C5D6891CD5C78319DA0BC1B084627A2584029827E5D036151F1445A`.
- Dump chỉ chứa cấu trúc, không chứa INSERT hay DROP TABLE/DROP DATABASE. Trên máy hiện tại chỉ Refresh Schemas trong Workbench; không nhập lại dump vào schema đã có bảng.
- Chi tiết trường, sơ đồ ERD và cách dùng: `docs/design/04-co-so-du-lieu.md`, `database/README.md`.

Khi làm Laravel: khai báo rõ `$table`, `$primaryKey`, các khóa ngoại, `CREATED_AT`, `UPDATED_AT`, trường xác thực `thu_dien_tu`, `mat_khau`, `ma_ghi_nho`. Không dùng migration mặc định tạo bảng `users` bên cạnh `nguoi_dung`. Bảng `trich_dan` không có ngày cập nhật; bảng liên kết không có timestamps. Bản đầu đề xuất session driver `file`.

## 5. Tài liệu luật và phần AI

- Đề bài được sao chép tại `docs/references/de-bai-ttnt-2026.pdf`; đề số 4 ở trang 2.
- Phân tích đầy đủ: `docs/requirements/01-phan-tich-yeu-cau.md`.
- Đề yêu cầu một văn bản, keyphrase, đặc tả khái niệm/dạng luật, bộ câu hỏi–đáp án, tra cứu và ngữ nghĩa đơn giản. Các con số mục tiêu trong tài liệu là đề xuất, không phải yêu cầu tối thiểu của giảng viên.
- Phạm vi đang đề xuất: Luật 116/2025/QH15. Tài liệu trước ghi nhận hiệu lực 01/07/2026 và dùng luật 2018 để tham khảo lịch sử; kiểm chứng nguồn khi biên soạn dữ liệu pháp lý.
- Cần thống nhất với giảng viên việc chọn an ninh mạng vì danh sách ví dụ của đề số 4 không nêu lĩnh vực này. Chưa có xác nhận được ghi nhận; điều này không cản việc thiết kế giao diện.
- PDF nằm trong `data/raw/laws/2025/` và `data/raw/laws/2018/`; manifest nguồn là `data/sources.json`.
- Bản 2025 có PDF scan và bản xuất web có lớp chữ. Đã trích xuất sơ bộ; chưa kiểm duyệt toàn bộ OCR/nội dung. Chỉ một trang đã được đối chiếu cho Điều 44.
- Không coi dữ liệu minh họa là bộ tri thức hoàn chỉnh. Không tự tạo số điều, mức phạt hoặc căn cứ khi chưa kiểm chứng.
- Dữ liệu đã duyệt dự kiến vào `data/processed/`, QA đánh giá vào `data/evaluation/`, chỉ mục Python vào `data/indexes/`.
- Giữ nguyên PDF nguồn; mỗi đáp án phải có căn cứ và phiên bản nội dung. Không trộn hai luật vào cùng chỉ mục mặc định.

## 6. Skills và tình trạng repository

- Theo yêu cầu người dùng, repo `https://github.com/emilkowalski/skills.git` đã được clone vào `.agent/skills/`.
- Các skill thực tế nằm trong `.agent/skills/skills/`, ví dụ `emil-design-eng`, `animate`, `improve-animations`, `review-animations`, `prototype`.
- `.agent` là vị trí người dùng chọn. Không giả định mọi agent tự phát hiện skills tại đây; đọc SKILL.md phù hợp khi làm frontend. Không cần clone lại.
- Repo skills có Git riêng. Giữ nguyên khi chỉnh dự án chính.
- Kiểm tra `git status --short` và đọc diff trước khi sửa; giữ toàn bộ công việc hiện có. Không dùng reset/clean để đưa về commit cũ.
- Người dùng đã yêu cầu commit và push phần thiết kế/database. File dump, cấu hình riêng và skills giữ local theo `.gitignore`; clone mới dùng `database/schema.sql` để tạo cơ sở dữ liệu.
- Thư mục `backend/app/` vẫn là khung Python ban đầu. Cấu trúc `backend/api/` Laravel và `backend/ai/` FastAPI mới chỉ là đề xuất.

## 7. Tiếp tục từ đâu

Yêu cầu database, commit/push trước đó đã hoàn tất (commit d79c2ec). Yêu cầu tiếp theo là thiết kế lại frontend theo stack đã chốt, tập trung đăng nhập/đăng ký, đồng thời chuyển giao diện chính cũ sang React và giữ bố cục: đã thực hiện. Người dùng đã yêu cầu commit và push toàn bộ phần frontend này lên nhánh `main` của `origin`. Bản bàn giao này đi cùng commit frontend; khi tiếp tục, kiểm tra `git status` và đối chiếu `HEAD` với `origin/main` để xác nhận trạng thái đồng bộ. Đã kiểm tra file đưa lên Git: không có mật khẩu/khóa riêng được phát hiện; `.env`, dump MySQL, `.agent`, dependencies và build được bỏ qua.

Bước tiếp theo tùy yêu cầu người dùng: duyệt giao diện, triển khai Laravel auth (CSRF/session, lỗi API, loading và redirect), hoặc hoàn thiện tra cứu/AI. Giữ tên cột tiếng Việt trong MySQL; không coi form frontend là xác thực hoặc phân quyền thật.

Trước khi chỉnh sửa, agent mới nên:

1. Đọc file này, `README.md`, `docs/technology-decisions.md`.
2. Đọc tài liệu chuyên phần sắp làm và kiểm tra mã thực tế.
3. Nêu ngắn gọn đã hiểu phần đã hoàn thành, phần chưa có và bước định làm.
4. Tiếp tục yêu cầu mới, giữ các quyết định đã chốt và tránh làm lại phần database đã xong.

Sau mỗi giai đoạn đáng kể, cập nhật trạng thái bàn giao để phiên tiếp theo có thể tiếp tục.

## 8. Quy ước đưa lên GitHub

Chỉ đưa mã nguồn, SQL tạo cấu trúc và tài liệu dự án lên GitHub. Bản dump `database/cyberlaw_search.sql` và bản Desktop giữ local; các liên kết tới dump trong tài liệu chỉ dùng trên máy đã tạo file. Không đưa mật khẩu, `.env`, khóa riêng, backup hoặc dữ liệu tài khoản lên repository. `database/schema.sql` là tệp cấu trúc dùng khi clone dự án sang máy khác.
