# Bàn giao dự án CyberLaw Search

Cập nhật ngày 27/09/2026, sau khi đổi tên bảng/cột MySQL sang tiếng Việt và cập nhật SQL dump trên Desktop.

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
| Frontend | Đã chốt React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Motion for React | Chưa chuyển mã, chưa có package.json |
| Backend | Người dùng muốn PHP kết hợp Python; đề xuất Laravel cho nghiệp vụ, FastAPI cho AI | Chưa khởi tạo Laravel/FastAPI chạy được |
| Database | Người dùng chọn MySQL; yêu cầu tên bảng và cột tiếng Việt không dấu | Đã tạo và kiểm tra trên MySQL 8.0.44 |
| Tài khoản | Có đăng ký, đăng nhập, đăng xuất và phân quyền | Đã có thiết kế/schema; chưa có chức năng thật |
| Phân quyền | Hai vai trò tài khoản user/admin; khách chưa đăng nhập | Chính sách chi tiết là đề xuất trong tài liệu |
| AI | Keyphrase, khái niệm, quy định có cấu trúc, tìm kiếm ngữ nghĩa và đáp án có căn cứ | Chưa triển khai; chưa chốt nhà cung cấp LLM/embedding |

Luồng kiến trúc đề xuất: `React → Laravel → FastAPI`, Laravel quản lý MySQL; Python xử lý tri thức và chỉ mục tìm kiếm. Giữ cách triển khai đơn giản trên cùng máy ở giai đoạn đầu.

## 3. Giao diện cần giữ

- Tham khảo ban đầu: https://bocongan.gov.vn/tim-kiem?search=an+ninh+mang&searchTypeId=title
- Nhận diện riêng CyberLaw Search: đỏ burgundy, vàng nhạt, nền sáng, chữ tiếng Việt dễ đọc.
- Sidebar luôn hiển thị bên trái trên desktop; bố cục responsive trên màn hình nhỏ.
- Thay nhân vật cán bộ ở mẫu tham khảo bằng robot AI làm nút mở chat.
- Người dùng muốn animation mượt, UI/UX đẹp. Hỗ trợ bàn phím và tùy chọn giảm chuyển động.
- Ảnh robot đã có: `frontend/assets/ai-assistant.png`; ưu tiên tái sử dụng.
- Các tệp đang chạy: `frontend/index.html`, `frontend/styles.css`, `frontend/app.js`.
- Hiện chỉ có tìm kiếm trên ba bản ghi minh họa và chat phản hồi dựng sẵn. Chưa kết nối database hoặc dịch vụ AI.
- Form và thiết kế mục tiêu: `docs/design/03-dac-ta-form.md`. Prompt Stitch: `docs/prompts/04-prompt-stitch.md`.
- Các yêu cầu bổ sung về trang tài khoản/quản trị nằm trong `docs/requirements/02-tai-khoan-phan-quyen.md`.

Xem bản mẫu từ thư mục gốc:

```powershell
python scripts/serve_frontend.py
```

Mở `http://127.0.0.1:4173`. Kiểm tra cổng trước khi khởi động vì có thể đã có tiến trình preview; không giả định phiên chạy của agent trước còn hoạt động.

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

Yêu cầu đổi tên database và cập nhật dump đã hoàn tất. Người dùng hiện muốn bàn giao sang agent khác, chưa giao một chức năng mới cụ thể.

Nếu người dùng yêu cầu tiếp tục giao diện, hướng hợp lý là chuyển bản mẫu hiện tại sang React/TypeScript/Vite theo stack đã chốt, giữ phong cách, sidebar và ảnh robot; sau đó làm màn hình đăng ký/đăng nhập và bố cục theo vai trò. Thực hiện theo yêu cầu tiếp theo của người dùng, không tự coi toàn bộ lộ trình là nhiệm vụ đang chạy.

Trước khi chỉnh sửa, agent mới nên:

1. Đọc file này, `README.md`, `docs/technology-decisions.md`.
2. Đọc tài liệu chuyên phần sắp làm và kiểm tra mã thực tế.
3. Nêu ngắn gọn đã hiểu phần đã hoàn thành, phần chưa có và bước định làm.
4. Tiếp tục yêu cầu mới, giữ các quyết định đã chốt và tránh làm lại phần database đã xong.

Sau mỗi giai đoạn đáng kể, cập nhật trạng thái bàn giao để phiên tiếp theo có thể tiếp tục.

## 8. Quy ước đưa lên GitHub

Chỉ đưa mã nguồn, SQL tạo cấu trúc và tài liệu dự án lên GitHub. Bản dump `database/cyberlaw_search.sql` và bản Desktop giữ local; các liên kết tới dump trong tài liệu chỉ dùng trên máy đã tạo file. Không đưa mật khẩu, `.env`, khóa riêng, backup hoặc dữ liệu tài khoản lên repository. `database/schema.sql` là tệp cấu trúc dùng khi clone dự án sang máy khác.
