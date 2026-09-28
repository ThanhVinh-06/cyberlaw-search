# Bàn giao dự án CyberLaw Search

Cập nhật ngày 27/09/2026: đã chuyển frontend sang React và thiết kế trang đăng ký/đăng nhập; database tiếng Việt giữ nguyên.

Tài liệu này giúp agent mới tiếp tục dự án mà không cần lịch sử chat. Đây là trạng thái tại thời điểm bàn giao; kiểm tra mã và yêu cầu mới của người dùng trước khi thực hiện công việc tiếp theo.

Trạng thái bàn giao mới nhất: người dùng đã duyệt và yêu cầu đưa toàn bộ phần giao diện đang chờ lên `origin/main`, gồm Văn bản & Tri thức, modal dùng chung, sidebar/logo/nút, lịch sử dùng thử và các sửa responsive. Thông điệp commit: `Hoan thien giao dien tri thuc, dong bo menu va kiem tra responsive`. Các ghi chú “chưa commit/push” bên dưới mô tả thời điểm triển khai trước yêu cầu này; đối chiếu `HEAD` và `origin/main` để xác nhận đồng bộ. Build và kiểm tra responsive liên quan đã đạt; đã rà soát file thay đổi, không thêm cấu hình bí mật, database dump, dependencies hoặc dữ liệu runtime.

## 1. Mục tiêu và cách làm việc

- **Quy ước mới của người dùng:** sau mỗi yêu cầu phải kiểm tra responsive các trang/thành phần liên quan trước khi báo hoàn thành; đã ghi trong `AGENTS.md`. Bao phủ điện thoại nhỏ, iPhone 16 Pro Max 440px, tablet/iPad, desktop và màn hình ngang; sửa CSS/layout chung thì kiểm tra cả mốc chuyển bố cục. Tái sử dụng test hiện có, xử lý lỗi tìm thấy, nói rõ giới hạn giả lập/thiết bị thật.

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
| Phân quyền | Hai vai trò tài khoản user/admin; quản lý qua Dashboard Admin `/admin` | Đã triển khai trang Admin CRUD người dùng, phân quyền RBAC, tìm kiếm, lọc, stats card theo schema `nguoi_dung` |
| AI | Keyphrase, khái niệm, quy định có cấu trúc, tìm kiếm ngữ nghĩa và đáp án có căn cứ | Chưa triển khai; chưa chốt nhà cung cấp LLM/embedding |

Luồng kiến trúc đề xuất: `React → Laravel → FastAPI`, Laravel quản lý MySQL; Python xử lý tri thức và chỉ mục tìm kiếm. Giữ cách triển khai đơn giản trên cùng máy ở giai đoạn đầu.

## 3. Giao diện cần giữ

- Lượt kiểm tra responsive sau chỉnh menu: bố cục qua các kích thước đã đạt, nhưng Axe phát hiện tiêu đề nhóm #9a9ba4 trên nền #fffefa chỉ có tương phản 2.73:1. Đã đổi **chung cả ba tiêu đề** sang xám #73747d (~4.6:1), giữ nguyên font/kích thước/lề để vừa đồng bộ vừa dễ đọc. Giá trị màu này thay cho #9a9ba4 trong ghi chú cũ bên dưới.
  - Kết quả sau sửa: 11 kịch bản liên quan đều đạt qua các lượt chạy (10 đạt lần đầu; kiểm tra Axe/responsive tài khoản và căn lề chạy lại đều đạt). Bao gồm 320–1920px, các mốc chuyển bố cục, màn hình ngang, thao tác cảm ứng, trang tài khoản/trang chính/lịch sử và bốn tab quản trị. Build/Prettier đạt; chưa kiểm tra trên thiết bị vật lý. Không commit/push trong lượt này.

- Căn lại menu tài khoản và trang chính để không xê dịch icon/chữ khi chuyển route: dùng chung `frontend/src/components/sidebar-navigation.css`, import từ `main.tsx`; đã gỡ các rule menu trùng trong `index.css` và `main-site.css`. Tiêu đề **KHÁM PHÁ**, **KHÔNG GIAN CỦA BẠN** lấy chuẩn **KHÔNG GIAN TRA CỨU**: Be Vietnam Pro 10px/600, line-height 1.65, letter-spacing 1.3px, màu #9a9ba4, padding 10px 14px. Menu chung gap 8px, lề ngang 14px; các mục padding 13px 14px, line-height 1.65, icon 19px/stroke 2. Active chỉ đổi màu/nền và vạch trái tuyệt đối, không đổi độ đậm/viền/chiều rộng khiến chữ hoặc icon xê dịch. Menu điện thoại vẫn 2 cột ở trang chính; popup tài khoản giữ focus trap và cuộn.
  - `e2e/sidebar-alignment.spec.ts` đo khung tiêu đề, khung từng mục, SVG và text range sau chuyển route thực tế, so sánh bằng nhau tại 901/1024/1440/1920px; đạt. Đã xem ảnh hai sidebar để đối chiếu trực quan. Chưa commit/push.

- Đồng bộ nhận diện theo yêu cầu mới: sidebar desktop trang tài khoản/trang chính/quản trị dùng `--sidebar-width: 270px` (theo quản trị), nền `--sidebar-background: #fffefa` (theo đăng nhập). Logo dùng chung `frontend/src/components/Brand.tsx`: khiên ShieldCheck, CyberLaw, slogan **HIỂU LUẬT · AN TÂM**, font/kích thước/màu lấy từ trang đăng nhập. Header sidebar dùng cùng padding; bỏ bộ logo CSS cũ. Menu tài khoản chuyển sang nút mở ở <=900px như quản trị; trang chính vẫn giữ menu 2 cột trên điện thoại theo bố cục đã duyệt. Form tài khoản một cột ở vùng tablet hẹp, menu popup giới hạn chiều cao và cuộn được khi xoay ngang.
  - `frontend/src/lib/navigation.ts` là nguồn chung cho tên/icon/link: **Thư viện văn bản** dùng Library, **Từ điển thuật ngữ** dùng BookOpen. `/terms` đồng bộ cả menu, breadcrumb, tiêu đề trang/tab trình duyệt. Nút hành động chính dùng màu đăng nhập `--primary: #752536`, hover `--primary-hover: #652133`, viền `--primary-border: #692034`; cập nhật trang chính, quản trị/modal, chat, thống kê và màn hình từ chối truy cập. Các nút phụ/trạng thái/nguy hiểm giữ phân biệt theo chức năng.
  - Menu người đã đăng nhập có **Lịch sử hỏi đáp** → `/history`; khách truy cập trực tiếp chuyển `/login?next=history`, đăng nhập đúng quay lại lịch sử. Link ở trang tài khoản cũng dựa trên trạng thái đăng nhập, không bắt đăng nhập lại người đã có phiên. Đây là giao diện dùng thử: hiển thị các trao đổi hiện có trong React state của MainSite, có mở căn cứ; chưa lưu lịch sử vào MySQL. Tải lại/rời MainSite/đăng xuất sẽ mất các trao đổi. Đổi người dùng xóa chat/draft để không lẫn nội dung giữa tài khoản. Trang lịch sử có Fade In Up dùng lại `AdminTabReveal` và trạng thái trống rõ ràng.
  - Khi kiểm tra ảnh, phát hiện cột họ tên ở bảng người dùng bị ép xuống nhiều dòng; đã đặt min-width cho nhóm avatar/tên, cho phép bảng cuộn trong khung. Kiểm tra số dòng tên mẫu tối đa 2, không ép từng từ thành hàng dọc.
  - Kiểm tra: build đạt (vẫn có cảnh báo bundle >500kB); bộ kiểm tra mới `e2e/navigation.spec.ts` gồm đồng bộ CSS thực tế giữa route, icon/tên giữ nguyên khi chuyển trang, đăng nhập/đăng xuất và lịch sử, cảm ứng DPR 3. Đã kiểm tra responsive 320/360/390/440/760/761/768/834/900/901/1024/1280/1440/1920px, ngang 844×390 và 956×440, bốn tab quản trị, các modal tài khoản/tri thức, chat, bàn phím/reduced motion và Axe trang tài khoản. Kiểm tra trên Edge giả lập; chưa kiểm tra Safari/iPhone/iPad vật lý. Ảnh tài khoản/trang chính trong `docs/design/screenshots/` được cập nhật bởi test; ảnh kiểm tra bổ sung trong `frontend/test-results/` (ignored). Chưa commit/push lượt đồng bộ này.

- Nội dung giao diện dùng cách xưng hô **“Bạn”** trong cảnh báo và hướng dẫn của modal. Đã đổi toàn bộ lời nhắc còn dùng “Anh”, gồm lỗi bỏ trống trường, thông báo kiểm tra form, chọn PDF, thiếu điều khoản/nguồn và chặn xóa văn bản. Khi trao đổi với người dùng trong cuộc trò chuyện vẫn xưng em/gọi anh.

- Sửa cấu hình TypeScript cho kiểm thử sau phản hồi file `e2e/admin-knowledge.spec.ts` báo lỗi trong trình soạn thảo: thêm `frontend/e2e/tsconfig.json`, kế thừa ES2022/Bundler/strict từ frontend và nạp kiểu Node cho Playwright. File kiểm thử tri thức import `Buffer` trực tiếp từ `node:buffer`. Trước đây tsconfig chính chỉ bao gồm `src` và `vite.config.ts`, nên kiểm tra build chưa bao phủ e2e. Lệnh `npm run test:e2e` hiện chạy `typecheck:e2e` trước Playwright; có thể chạy riêng `npm run typecheck:e2e`. Đã kiểm tra TypeScript toàn bộ e2e + cấu hình Playwright, TypeScript ứng dụng, Prettier các file sửa và test tri thức tìm kiếm/validation/PDF/xóa/lưu trữ: đều đạt. Không đổi giao diện trong lượt sửa này.

- Theo phản hồi mới, các modal quản trị tài khoản và Văn bản & Tri thức đã dùng chung `frontend/src/components/admin/AdminDialog.tsx` + `admin-dialog.css`. Tham chiếu đúng nhánh mở giữa màn hình của `ArticleDialog.tsx` khi xem Khoản 1 Điều 2 ở trang thuật ngữ: spring **190 / 25 / 0.85**, mở từ scale .94 + translateY 18px đến kích thước thật, đóng về scale .96 + 12px. Backdrop burgundy rgba(22,10,17,.68), blur 14px/saturate 180%, fade 450ms. Giữ nguyên animation của ArticleDialog và popup hỏi đáp thống kê.
  - Các nhóm label + trường nhập hiện Fade In Up **400ms**, dịch 14px, bắt đầu sau 120ms và nối tiếp 50ms (giới hạn độ trễ các nhóm sau để form dài không phải đợi lâu). Tái sử dụng WAAPI và token ease-out; chỉ chạy khi mở/đổi chế độ dialog, không chạy lại khi nhập/đổi vai trò hoặc báo lỗi. Dừng entrance khi người dùng tương tác nội dung, không cản nhập liệu. Khi chọn reduced motion dùng fade 160ms; theo dõi thay đổi preference ngay trong phiên. Mở bằng bàn phím hiển thị ngay.
  - Năm modal tài khoản (thêm, sửa, xem, khóa/mở khóa, xóa) đã chuyển từ div/keyframe cũ sang một Radix Dialog chung: có focus trap, Escape, click nền, trả focus về nút đã mở và fallback về nút thêm khi bản ghi bị xóa. Giữ form và thao tác CRUD minh họa hiện có. Chuyển xem→sửa gọi preventDefault để không vô tình submit do React tái sử dụng nút. Nội dung cuộn bên trong, footer luôn thấy; nhóm vai trò/trạng thái xếp dọc trên điện thoại.
  - `KnowledgeDialog` hiện là wrapper mỏng dùng cùng component. Trang tri thức truyền khóa chế độ/loại/ID để chỉ reveal khi chuyển nội dung có chủ ý. Các thay đổi này chưa commit/push.
  - Kiểm tra: build đạt; 6 kiểm tra mới trong `e2e/admin-dialog.spec.ts` và 6 kiểm tra tri thức hiện có đã đạt sau sửa. Bao gồm đo frame khung lớn dần, thứ tự/độ trễ nhóm trường, không replay khi nhập/validation, CRUD tài khoản, xem→sửa, Escape/click nền/đóng sớm, trả focus, 320×568/440×956/834×956, reduced motion kể cả đổi tùy chọn ngay trong phiên và Axe của modal tri thức. Test đếm entrance tính đến StrictMode chạy setup effect hai lần trong dev (lượt đầu được cancel). Đã xem ảnh desktop/mobile; chưa kiểm tra Safari trên thiết bị thật. Không thay đổi `ArticleDialog.tsx` hoặc schema/database trong lượt này.

- Điều chỉnh theo phản hồi tiếp theo: nội dung khi chuyển 4 tab con trong **Văn bản & Tri thức** dùng Fade In Up **450ms** (trước là 350ms), giữ stagger 50ms và khoảng dịch 14px. `AdminTabReveal` nhận prop `duration`, mặc định 350ms cho các nơi khác. Header/box tổng quan vẫn 350ms; reduced motion vẫn fade 160ms và bàn phím hiển thị ngay.

- Đã thiết kế trang **Văn bản & Tri thức** theo yêu cầu ngày 28/09/2026 tại `/admin/documents`, tích hợp vào tab quản trị hiện có qua `AdminDocumentsPage.tsx`. Gồm bốn box đếm dữ liệu thực trong bản dùng thử và bốn tab con: Văn bản, Điều khoản, Từ khóa & Khái niệm, Quy định. Tông burgundy/kem, hover box nâng 2px và bóng nhẹ; icon không phóng to. Tái sử dụng `AdminTabReveal` cho Fade In Up 350ms theo từng khối khi vào/chuyển tab; không chạy lại khi nhập tìm kiếm/cập nhật dữ liệu. Có reduced motion và chuyển tab bằng bàn phím hiển thị ngay.
  - `frontend/src/lib/knowledge-data.ts` định nghĩa các kiểu/quan hệ theo năm bảng `van_ban`, `dieu_khoan`, `tu_khoa`, `dieu_khoan_tu_khoa`, `quy_dinh`; dữ liệu mẫu **cố ý hư cấu**, số hiệu `VB-MAU-*`, không dùng làm căn cứ pháp luật. Chưa kết nối MySQL, Laravel, OCR hoặc AI; không sửa SQL/PDF nguồn. Trạng thái công bố chỉ mô phỏng, không khẳng định hiệu lực pháp lý. Header riêng tab này ghi “Bản minh họa”.
  - Thêm/sửa/xem/xóa, tìm kiếm không dấu, bộ lọc, phân trang 6 mục, đếm số liên kết, công bố/lưu trữ/khôi phục bản nháp hoạt động trong React state. **Dữ liệu và PDF dùng thử chỉ giữ trong lần mở trang này; rời sang tab quản trị khác hoặc tải lại sẽ đặt lại**; đã ghi rõ trên giao diện. Các tab con giữ dữ liệu trong lúc chuyển qua lại. PDF tối đa 20MB chỉ xem qua blob URL tại máy, không upload; URL được giải phóng khi thay/xóa/rời trang.
  - Form có kiểm tra trường bắt buộc, số hiệu/vị trí điều khoản/cụm từ trùng, ngày kết thúc hiệu lực, khoản khi có điểm, trang PDF, nguồn định nghĩa và trích nguyên văn khớp điều khoản. Có đủ 8 loại quy định đúng schema. Liên kết từ khóa quản lý trong form từ khóa; nguồn điều khoản/văn bản bấm mở để đối chiếu. Khi sửa tri thức, văn bản đã công bố liên quan được đưa về nháp và tăng phiên bản nội dung. Không xóa văn bản còn điều khoản hoặc điều khoản đang làm căn cứ quy định/định nghĩa; đề xuất lưu trữ văn bản thay thế.
  - Các component `KnowledgeDialog.tsx`, `KnowledgeForm.tsx`, `KnowledgeDetail.tsx` và CSS `knowledge.css` nằm trong `frontend/src/components/admin/`. Popup đã nâng cấp sang `AdminDialog` dùng spring cùng trang thuật ngữ, xem ghi chú đầu mục này; vẫn có Escape, focus trap, trả focus, cuộn nội dung và footer luôn thấy. Trích dẫn dùng shadow người dùng đã duyệt, không có viền đỏ trái. Chặn default của click chuyển chế độ xem→sửa để nút footer mới không tự submit form do React tái sử dụng DOM.
  - Desktop dùng bảng; dưới 720px dùng thẻ và 4 tab con xếp 2×2. Box thống kê xếp 2 cột trên màn hình nhỏ, dưới 360px đưa icon lên trên để không ép chữ. Form chuyển một cột trên điện thoại, font input 16px tránh zoom khi nhập. Test mới `frontend/e2e/admin-knowledge.spec.ts` bao phủ CRUD dùng thử, nguồn PDF, liên kết/căn cứ, chặn xóa, responsive 320/440/834px, bàn phím, reduced motion, không replay entrance khi lọc và Axe. Ảnh kiểm tra nằm trong `frontend/test-results/` (ignored).
  - Kiểm tra hoàn tất: build đạt (còn cảnh báo bundle JS trên 500kB), định dạng các file thay đổi đạt, 6 test mới đạt; 6 test responsive quản trị và 5 test thống kê cũ đều đạt sau khi chạy lại riêng một test đo frame popup. Lượt chạy chung test này lấy được đúng 3 frame trung gian trong khi kỳ vọng >3; chạy lại riêng đạt, không sửa mã/test popup thống kê. Đã xem ảnh desktop, mobile và popup; kiểm tra bằng Edge giả lập, chưa thử Safari trên thiết bị thật. Chưa commit/push phần trang Văn bản & Tri thức; chờ yêu cầu tiếp theo của người dùng.

- Đã sửa responsive khung quản trị theo phản hồi iPhone 16 Pro Max: trước đó breadcrumb xuống quá nhiều dòng và tràn thanh 64px, nút menu mobile luôn `display: none`. `AdminLayout.tsx` hiện có nút menu dưới 900px, tên tab/breadcrumb một dòng tự cắt `…`, ẩn breadcrumb cha dưới 1200px; dưới 600px ẩn nhãn MySQL và rút nút về tra cứu còn icon (vẫn có accessible label/title). Menu mobile dùng Radix Dialog sẵn có, chiều rộng giới hạn theo viewport, khóa cuộn/focus và trả focus khi đóng; chuyển được cả 4 tab bằng chạm. H1 dài trên điện thoại dùng ellipsis, nhãn đầy đủ giữ trong DOM/title. Bộ lọc, tab phụ, tiêu đề ma trận và header biểu đồ xếp lại trên màn hình nhỏ; bảng vẫn cuộn ngang trong box để giữ dữ liệu/các nút thao tác.
  - Đã build đạt và chạy 11 kiểm tra liên quan: 5 kích thước 320/440/834/1024/1440px qua cả 4 tab, 1 giả lập cảm ứng 440×956/DPR 3, 5 test biểu đồ/popup cũ. Đã xem ảnh mobile. Đây là kiểm tra trên Edge giả lập viewport, chưa kiểm tra Safari trên iPhone thật. Người dùng đã duyệt và yêu cầu commit/push phần responsive lên `origin/main`, thông điệp tiếng Việt không dấu: `Sua responsive bon tab quan tri tren dien thoai va may tinh bang`. Đối chiếu `HEAD` với `origin/main` để xác nhận trạng thái đồng bộ.
  - Tại lượt sửa responsive ban đầu, tab Văn bản & Tri thức chưa có nội dung riêng. Lượt thiết kế tiếp theo đã bổ sung đầy đủ giao diện dùng thử, xem ghi chú đầu mục này. `/admin/documents` chọn đúng tab khi tải trực tiếp.

- **Quy ước chung đã chốt:** mọi trang/tab làm sau này đều có animation **Fade In Up** mượt mà và đồng bộ. Nội dung hiện nhẹ từ dưới lên, từng khối xuất hiện nối tiếp khi vào/chuyển trang; tham khảo nhịp các trang quản trị đã duyệt và tái sử dụng thành phần hiện có khi phù hợp. Không phát lại khi nhập tìm kiếm hoặc cập nhật dữ liệu thông thường; giữ bố cục ổn định, hover, focus bàn phím và hỗ trợ reduced motion. Agent tiếp theo áp dụng mặc định, không cần hỏi lại từng trang. Yêu cầu này đã được lưu cả trong `AGENTS.md`.

- Hai tab **Người dùng & Phân quyền** và **Ma trận quyền hạn** đã có Fade In Up khi vào/chuyển tab, nhịp tương tự trang thống kê: 350ms, dịch lên 14px, tiêu đề → bốn box tổng quan cách nhau 50ms → tab/bộ lọc/bảng. `AdminTabReveal.tsx` dùng WAAPI trên các phần có `data-admin-reveal`, chỉ chạy theo tab, không chạy lại khi gõ tìm kiếm/đổi dữ liệu. Chuyển nhanh tiếp tục từ frame hiện tại, không remount các nút tab nên giữ focus; thao tác vào nội dung dừng entrance. Dùng `translate` độc lập để giữ hover của box; reduced motion chỉ fade 160ms, chuyển tab bằng bàn phím hiển thị ngay. Modal và toast nằm ngoài vùng animation. Đã build thành công và kiểm tra Edge: cả hai tab, bộ lọc giữ nguyên, chuyển liên tục, hover, focus bàn phím, reduced motion, màn hình 440px; không có lỗi trình duyệt. Không thay animation của trang thống kê trong lượt này.

- Theo yêu cầu, ẩn thanh cuộn bên phải của toàn bộ trang hiện tại và tương lai bằng selector `html` với `scrollbar-width: none` và fallback WebKit trong index.css dùng chung; vẫn cuộn bằng chuột/cảm ứng/bàn phím. Khi popup khóa cuộn, chiều rộng viewport không đổi và không cần bù padding, tránh dịch ngang animation. Quy tắc áp dụng cả trang tài khoản; thanh cuộn bên trong nội dung điều khoản vẫn giữ nguyên. Có kiểm tra geometry mở/đóng lặp lại và cuộn trang trong article-animation.spec.ts.

- Kết quả tìm kiếm có Fade In Up nối tiếp nhau theo mẫu https://codepen.io/whoran/pen/WNbxpML: wrapper `ResultReveal.tsx` dùng Web Animations API (opacity + translateY 16px, 950ms, cách nhau 80ms, dùng token `--ease-out`). Chạy sau mỗi lần tìm kiếm hợp lệ/gợi ý kể cả từ khóa cũ; gõ bộ lọc hoặc lần tải đầu không chạy. Giữ key theo điều khoản; bấm liên tục tiếp tục từ trạng thái hiện tại. Wrapper tách khỏi shared layout của `motion.article`, dừng entrance khi tương tác để mở điều khoản đúng vị trí. Nút Đặt lại chạy cùng Fade In Up khi bấm bằng chuột/cảm ứng; bàn phím hiển thị ngay; reduced motion chỉ fade 160ms, hỗ trợ đổi tùy chọn ngay trong phiên. Đã build và kiểm tra tìm kiếm, responsive, popup điều khoản; ba test trong `e2e/search-animation.spec.ts` đạt, gồm kiểm tra vị trí chữ qua từng frame khi tìm kiếm/đặt lại liên tục. Đã sửa xung đột với Motion shared layout bằng `layoutDependency` trên thẻ và tiêu đề: chỉ đo lại khi trạng thái mở điều khoản tương ứng thay đổi. Tái hiện được lỗi trước khi sửa; build và 8 test tìm kiếm/trang chính/popup điều khoản đạt sau sửa. Người dùng đã duyệt và yêu cầu đưa các thay đổi Fade In Up 950ms, màu nền và thanh cuộn vào cùng đợt commit; đối chiếu HEAD với origin/main để xác nhận đồng bộ.

- Nền trang chính dùng chung biến `--background` (#f8f7f4) với trang tài khoản, thông qua `--bg: var(--background)` trong main-site.css theo yêu cầu đồng nhất màu nền.

- Popup robot ở `/login` và `/register` đã chuyển từ Dialog giữa màn hình sang `ChatPopover` dùng chung với trang chủ: shared layout, spring 0.5 s/bounce 0.1, mở rộng từ launcher và thu về khi đóng. Tách CSS phần khung chat sang `frontend/src/components/ChatPopover.css` với scope riêng; giữ nội dung thông báo AI đang hoàn thiện và liên kết tra cứu trên trang tài khoản. Hỗ trợ Esc, click ngoài, trả focus, reduced motion, đóng khi đổi route. Mobile đặt launcher ở cuối trang để không che form, popup mở cố định trong viewport. Đã build thành công và đạt 11 kiểm tra Playwright trong auth/chat-popover, gồm 2 kiểm tra mới cho popup tài khoản; đã xem ảnh desktop/mobile. Thay đổi này được đưa vào đợt commit giao diện tài khoản cùng các chỉnh sửa sidebar theo yêu cầu của người dùng; đối chiếu HEAD với origin/main để xác nhận push.

- Nút Đăng nhập cuối sidebar dùng nền đỏ, chữ trắng và bo góc cùng class `cl-primary` với nút Tìm kiếm; thu gọn nhẹ với min-height 40px, padding 8px 16px theo yêu cầu. Đăng ký giữ dạng liên kết.

- Yêu cầu mới: chuyển Đăng nhập/Đăng ký từ thanh breadcrumb xuống cuối sidebar trái, thay vị trí nhãn “Bản thiết kế giao diện” đã bỏ. Mobile giữ hai liên kết ngay dưới nhóm menu (ẩn phần mô tả đồ án để gọn). Chỉnh tại MainSite.tsx và main-site.css; được đưa vào cùng đợt commit popup tài khoản.
- Người dùng đã duyệt animation điều khoản/chat và yêu cầu commit/push lên GitHub. Đã xóa `.kilo` theo yêu cầu: nó chỉ chứa worktree phụ `pickle-purple` sạch ở commit `ddb4c9f`, không có file sửa/ignored cần giữ hoặc tiến trình dùng đường dẫn đó. Gỡ bằng `git worktree remove`, sau đó xóa thư mục `.kilo`; thêm `.kilo/` vào `.gitignore`. Không ảnh hưởng frontend/backend/database hoặc skills trong `.agent`. Khi tiếp tục, đối chiếu HEAD với origin/main để kiểm tra đồng bộ.
- Cập nhật chat robot theo yêu cầu mới: đã đọc và giữ phần Motion shared layout của Antigravity trong `ArticleDialog.tsx`. Chat trang chính dùng component mới `frontend/src/components/ChatPopover.tsx`, tham khảo Feedback popover ở Module 3 trên animations.dev. Nút robot dạng khối bo góc và panel dùng chung layoutId trong LayoutGroup riêng; robot cũng có layoutId riêng để chuyển vào header. Spring duration 0.5 s, bounce 0.1; phần nội dung xuất hiện sau 120 ms. Popup mở rộng lên trên từ góc dưới phải và thu về nút, không dùng hidden để bật/tắt đột ngột. Motion chỉ nội suy transform/opacity và bù bo góc qua shared layout.
- Chat hỗ trợ Esc/nút đóng/click ngoài, trả focus khi đóng chủ động; click ngoài giữ focus tại phần vừa bấm. Câu hỏi đang soạn và tin nhắn mẫu vẫn còn khi mở lại. Popup không khóa trang như modal; khi mở căn cứ từ chat, popup chat vẫn giữ nguyên. Bàn phím bỏ morph, reduced motion dùng fade 160 ms. Responsive đã kiểm tra 390×844, 320×568, 844×390 và desktop. Chưa có API AI thật. Robot trên trang tài khoản đã được cập nhật ở đợt tiếp theo, xem ghi chú đầu mục này.
- Đã giới hạn layoutId tiêu đề điều khoản vào cặp thẻ kết quả/modal; tiêu đề trong thư viện ẩn không dùng chung ID nữa để tránh mất chữ khi chat làm trang render lại. File `ArticleDialog.tsx` của Antigravity giữ nguyên (SHA-256 B50E9DF28546307E31BFD032B920CFAD178A287898EF8E6C6D3C81A9E55ECC68). Bộ kiểm tra hiện có 14 kịch bản, gồm 3 kịch bản mới trong `frontend/e2e/chat-popover.spec.ts`; đã đạt, các kịch bản liên quan được chạy lại sau sửa layoutId. Các thay đổi animation/chat trang chủ đã push ở commit bd39b54.
- Cập nhật animation điều khoản: thiết kế lại chuẩn theo triết lý và ví dụ mẫu tại Module 04 "Good vs Great animations" trên https://animations.dev/ (mẫu App Store Card Expansion / Shared Layout bằng Motion). Thẻ kết quả tra cứu chuyển thành `<motion.article layoutId={`article-card-${article.id}`}>`, tiêu đề `<motion.h3 layoutId={`article-title-${article.id}`}>`. Khi bấm "Xem điều khoản", thẻ gốc phóng lớn và biến hình mượt mà thành modal dialog căn cứ giữa màn hình với spring physics (`stiffness: 190, damping: 25, mass: 0.85`), tạo cảm giác chuyển động êm, chậm và mượt mà ("đẹp chậm, và mượt mà"). Backdrop làm mờ sâu chuẩn frosted glass (`backdrop-filter: blur(14px) saturate(180%)`) kết hợp sắc độ burgundy ấm (`rgba(22, 10, 17, 0.68)`). Nội dung căn cứ pháp lý hiện dần với độ trễ nhẹ (`y: 14 -> 0, opacity: 0 -> 1, delay: 0.12s`). Khi đóng bằng nút X, bấm ra nền hoặc phím Escape, modal thu nhỏ và hạ cánh mượt mà trở lại đúng vị trí thẻ kết quả ban đầu, trả focus về nút kích hoạt và khôi phục thanh cuộn trang.
- Hỗ trợ trợ năng và phím: người dùng bật `prefers-reduced-motion` được chuyển sang hiệu ứng crossfade nhẹ 160 ms không dịch chuyển vị trí. Phím Tab được giữ trong phạm vi modal (focus trap). Khi mở từ chat AI hoặc thư viện, modal xuất hiện êm từ trung tâm với cùng thông số spring. Toàn bộ 11 kịch bản kiểm thử Playwright (`npm run test:e2e`) đều đạt. Build và format Prettier đạt chuẩn.
- Cập nhật Dashboard Phân quyền Admin (`/admin` và `/admin/users`): Thiết kế giao diện Quản trị & Phân quyền hoàn chỉnh theo yêu cầu người dùng, khớp chuẩn dữ liệu bảng `nguoi_dung` trong `database/schema.sql` và tài liệu `docs/requirements/02-tai-khoan-phan-quyen.md`. Bao gồm:
  + Các trường dữ liệu: `ma_nguoi_dung`, `ho_ten`, `thu_dien_tu`, `mat_khau`, `vai_tro` (`admin` / `user`), `trang_thai` (`active` / `blocked`), `ngay_tao`, `ngay_cap_nhat`.
  + Giao diện đồng bộ: sidebar quản trị màu kem, đỏ burgundy `#800020`, font `Be Vietnam Pro`, breadcrumb và trạng thái kết nối MySQL 8.0.
  + Thẻ thống kê tổng quan (Stats Cards): Tổng tài khoản, Quản trị viên, Đang hoạt động, Bị tạm khóa.
  + Tìm kiếm & Bộ lọc: Ô tìm kiếm tức thời theo họ tên hoặc email, bộ lọc dropdown theo vai trò và trạng thái tài khoản.
  + Tính năng CRUD hoàn chỉnh:
    * Thêm tài khoản mới: modal dialog có form validation (họ tên, email đúng định dạng & không trùng lặp, mật khẩu khởi tạo, chọn vai trò và trạng thái kèm mô tả quyền hạn).
    * Xem chi tiết: modal thông tin tài khoản, ngày tạo, cập nhật, số cuộc trò chuyện AI và các quyền hạn được gán.
    * Chỉnh sửa thông tin & phân quyền: modal cập nhật họ tên, email, thay đổi vai trò (user ↔ admin), đổi trạng thái, tùy chọn đổi mật khẩu mới.
    * Khóa / Mở khóa nhanh: modal xác nhận thao tác an toàn; có cơ chế bảo vệ ngăn chặn tự khóa Quản trị viên Hệ thống chính (#1) hoặc Admin hoạt động duy nhất.
    * Xóa tài khoản vĩnh viễn: modal cảnh báo nguy hiểm và xác nhận xóa tài khoản khỏi CSDL.
  + Tab Ma trận phân quyền RBAC: Bảng đối chiếu chi tiết quyền hạn giữa Khách vãng lai, Người dùng và Quản trị viên theo tài liệu `02-tai-khoan-phan-quyen.md`.
  + Tích hợp điều hướng & Bảo mật phân quyền theo vai trò (Cập nhật theo yêu cầu người dùng):
    * Ẩn hoàn toàn trang Quản trị và các liên kết menubar/sidebar đối với khách vãng lai và tài khoản người dùng thường.
    * Khi đăng nhập đúng email/mật khẩu Admin (`admin@cyberlaw.vn` / `admin12345`): tự động điều hướng sang `/admin`, thanh menubar và sidebar hiển thị mục "Quản trị hệ thống".
    * Khi đăng nhập đúng email/mật khẩu User (`mai.nguyen@gmail.com` / `user12345`): tự động điều hướng sang trang người dùng (`/search`), sidebar hiển thị hồ sơ cá nhân và KHÔNG CÓ mục Quản trị.
    * Bảo vệ route `/admin` (Guard): Khách vãng lai cố tình vào `/admin` bị yêu cầu đăng nhập; User thường cố tình vào `/admin` bị chặn với màn hình cảnh báo 403 (Từ chối quyền truy cập).
    * Tinh chỉnh menubar quản trị: Bỏ các badge CRUD, RBAC, Sắp tới, DB 9 bảng; cố định chiều cao đồng đều 44px và chiều rộng cho tất cả các box menubar (Người dùng & Phân quyền, Ma trận quyền hạn, Thống kê, Văn bản), đảm bảo thẳng hàng và không bị lệch kích thước.
  + Nâng cấp Animation thông báo CRUD góc phải dưới (Theo mẫu CSS/Motion của animations.dev):
    * Loại bỏ hoàn toàn hộp thông báo màu đen cũ một dòng thô cứng.
    * Tạo component `AdminToast.tsx` (`AdminToastContainer`, `ToastItem`): thiết kế chuẩn thẻ toast trắng kem bo góc `rounded-xl`, shadow nổi sâu (`shadow-[0_12px_32px_rgba(0,0,0,0.12)]`), hỗ trợ xếp chồng đa thông báo (multi-toast stacking) tự động trượt sắp xếp bằng Motion layout animation.
    * Cấu trúc thông báo 2 dòng chi tiết: tiêu đề in đậm rõ ràng + dòng mô tả cụ thể về tài khoản và hành động được thực hiện.
    * Phân loại màu sắc và icon tinh tế: Xóa tài khoản (đỏ burgundy/rose), Khóa tài khoản (hổ phách/amber), Mở khóa & Thêm mới (xanh ngọc/emerald), Xem thông tin (đỏ mận burgundy/indigo).
    * Hiệu ứng chuyển động tự nhiên: Trượt vào với spring physics (`stiffness: 420, damping: 28, mass: 0.8`), trượt ra sang phải khi hết hạn (3.8s) hoặc khi bấm nút X.
    * Hiệu ứng phản hồi xúc giác trên các icon CRUD (`cl-admin-action-btn`): Micro-scale 1.1 khi hover, chuyển màu riêng biệt theo hành động (xem/sửa/khóa/xóa), co nhẹ 0.92 khi bấm chuột (active press) với cubic-bezier `(0.16, 1, 0.3, 1)`.
    * Tinh chỉnh thanh tìm kiếm & Nút X xóa nhanh email/họ tên:
    * Khắc phục lỗi icon X bị tụt xuống góc đáy và bị văng ra viền ngoài (do selector `.cl-admin-toolbar-search svg` áp dụng nhầm `left: 12px; pointer-events: none`).
    * Thiết kế nút xóa `cl-admin-search-clear-btn` tròn 28x28px tinh tế, căn giữa hoàn hảo theo chiều dọc (`align-items: center`), cách mép ô tìm kiếm một khoảng đệm 8px ("cách xa ô tìm kiếm một xíu, chỉ một xíu thôi").
    * Xử lý tương tác: Click nút X lập tức xóa trắng từ khóa tìm kiếm (`searchQuery = ""`), tự động focus lại con trỏ vào ô input (`searchInputRef.current?.focus()`), bảng người dùng khôi phục đầy đủ tức thì.
  + Tinh chỉnh hiển thị thẻ trạng thái tài khoản (Status Badges) trong trang Quản trị & Phân quyền:
    * Đồng bộ kích thước chuẩn và hình dáng: cố định kích thước `.cl-admin-status-badge` thành `width: 104px; height: 42px;` và padding `4px 8px;`, đặt `min-width: 130px;` cho cột header `<th>Trạng thái</th>`. Cả hai box "Đang hoạt động" và "Đã bị khóa" đều có kích thước $104\text{px} \times 42\text{px}$ bằng hệt nhau, không bị lệch kích thước dù hiển thị ở bất kỳ màn hình nào.
    * Định dạng 2 dòng cân đối: cả "Đang hoạt động" (`Đang hoạt / động`) và "Đã bị khóa" (`Đã bị / khóa`) đều được tách 2 dòng đồng nhất với `text-align: center`, chữ dòng dưới tự động căn giữa thẳng hàng dưới chữ dòng trên.
  + Triển khai trang Thống kê & Báo cáo (Mazer Profile Statistics Dashboard) theo yêu cầu người dùng:
    * Tham khảo chuẩn bố cục và phong cách từ theme Mazer (`https://themewagon.github.io/mazer/` Profile Statistics), điều chỉnh nội dung đồng bộ với CSDL MySQL `cyberlaw_search` (`schema.sql`):
    * Hàng 1 (4 Stat Cards hàng đầu): Người dùng hệ thống (1.280 - bảng `nguoi_dung`), Văn bản & Điều khoản (47 điều - bảng `van_ban`, `dieu_khoan`), Quy định bóc tách (328 quy định - bảng `quy_dinh`), Lượt hỏi đáp AI (3.450 cuộc trò chuyện - bảng `hoi_thoai`, `tin_nhan`). Theo yêu cầu người dùng, đã bỏ hiệu ứng phóng to icon khi hover (`.cl-stat-icon-wrapper`); giữ kích thước icon cố định. Hover cả box đồng bộ trang Người dùng & Phân quyền: nâng 2px, bóng `0 4px 12px rgba(0,0,0,.05)`, transition 200ms ease; bóng mặc định `0 1px 3px rgba(0,0,0,.03)`. Dùng CSS `translate` riêng để không bị inline `transform` của Motion lúc xuất hiện ghi đè; chỉ hover bằng chuột, reduced motion không nâng. Đã đối chiếu computed style cả 4 box với trang người dùng trên Edge.
    * Cột chính bên trái:
      - Biểu đồ Cột "Xu hướng Hỏi đáp AI & Tra cứu Pháp luật" (Profile Visit của Mazer): 12 tháng với 2 cột song song (Hỏi đáp AI đỏ burgundy, Tra cứu điều khoản xanh sky), các đường lưới đứt ngang, tooltip nổi hiển thị chi tiết khi rê chuột, bộ lọc thời gian (Năm 2026, 6 tháng gần nhất, 30 ngày qua).
      - Nâng cấp Animation & Khắc phục lỗi dính layout biểu đồ cột (Theo phản hồi người dùng):
        * Khắc phục triệt để lỗi cột Tháng 1 (T1) bị dính sát vào số 150 trên trục tung: Tách riêng trục tung thành container độc lập `.cl-barchart-yaxis` có chiều rộng cố định 44px, text-align right, padding phải 14px và đường kẻ ngăn cách `border-right: 1px solid #f0eae5`. Vùng vẽ cột `.cl-barchart-plot-area` được đặt độc lập bên phải với đệm hai đầu `padding: 0 14px;`, đảm bảo cột T1 luôn có khoảng thở thoáng đẹp với trục tọa độ số, không bao giờ bị đè hoặc chạm vào số 150.
        * Hiệu ứng Animation lướt sóng (Stagger Wave Animation) mượt mà như web demo Mazer: Sử dụng Framer Motion áp dụng cho 24 cột tháng (12 cột Hỏi đáp đỏ burgundy và 12 cột Tra cứu xanh sky) với đường cong chuyển động spring hồi tiếp `ease: [0.34, 1.45, 0.64, 1]`, thời lượng 0.6s và độ trễ tuần tự nối tiếp `delay: 0.08 + index * 0.045` (cột Hỏi đáp) và `delay: 0.11 + index * 0.045` (cột Tra cứu). Khi mở trang hoặc đổi bộ lọc thời gian, các cột đồng loạt dâng lên dạng sóng nước nhịp nhàng, uốn lượn mượt mà từ tháng 1 đến tháng 12.
        * Củng cố bố cục Flexbox hàng ngang: Bổ sung `flex-direction: row !important` và `align-items: flex-end !important` cho `.cl-barchart-layout`, `.cl-barchart-columns-wrapper`, `.cl-barchart-x-labels` nhằm chống sập layout flex-direction khi có CSS kế thừa.
      - Cập nhật 28/09/2026: "Hỏi đáp AI & Căn cứ Pháp lý gần đây" chiếm trọn chiều rộng cột chính dưới biểu đồ cột. `RecentQuestionsCard.tsx` và CSS riêng nằm trong `frontend/src/components/admin/`.
        * Theo mẫu Good vs Great tại https://animations.dev/, thẻ mở thành popup chi tiết bằng shared layout và thu về thẻ nguồn. Dùng Motion `LayoutGroup`, `layoutId`, `AnimatePresence`; spring 190/25/0.85 đồng bộ popup điều khoản trang chính. Danh sách phía sau giữ nguyên vị trí; đã bỏ accordion cũ có cả layout scale lẫn height animation.
        * Popup dùng Radix Dialog có focus trap, Escape, đóng bằng nền/X, trả focus về thẻ và khóa cuộn. Nội dung dài cuộn bên trong; reduced motion dùng fade 160ms, mở bằng bàn phím hiển thị ngay. Chi tiết fade sau khi khung bắt đầu nở, giữ ảnh đại diện/tiêu đề liên tục qua chuyển cảnh.
        * Giữ nội dung mẫu từ `admin-data.ts`, ghi rõ "Dữ liệu minh họa". Đây chưa phải truy vấn MySQL, phản hồi AI thật hay căn cứ pháp lý đã kiểm chứng. Sao chép chỉ báo thành công sau khi clipboard ghi xong; liên kết thư viện trỏ `/library`.
    * Cột phụ bên phải:
      - Thẻ Profile Card: Avatar AD, Quản trị viên Hệ thống, `@admin • admin@cyberlaw.vn`, nhãn Super Admin và trạng thái CSDL trực tuyến (MySQL 8.0 • 9 bảng).
      - Thẻ "Người dùng hỏi đáp nhiều" (Recent Messages trong Mazer): 4 tài khoản hoạt động tích cực kèm chấm trạng thái online/idle/offline, nút chuyển nhanh sang Quản lý tài khoản.
      - Thẻ "Độ chính xác Căn cứ AI" (Visitors Profile Donut Chart trong Mazer): Biểu đồ Donut SVG tương tác với tỷ lệ 78% trích dẫn chính xác điều khoản, 16% giải thích thuật ngữ, 6% cần thêm ngữ cảnh; nhãn trung tâm "94% Tin cậy".
      - Ngay bên dưới là "Phân loại Quy định" (`RegulationBreakdownCard.tsx` và CSS riêng). Giữ 4 sparkline SVG và màu nhóm; tham khảo tương tác Total Sales của Falcon https://prium.github.io/falcon/v3.26.0/index.html. Rê/chọn điểm hiện trục, đường dóng, tooltip; click/tap ghim điểm, click cùng điểm bỏ ghim. Hỗ trợ mũi tên/Home/End/Enter/Escape, chiều cao cố định để trang không nhảy. Bảy giá trị mẫu được gọi là "Mốc 1–7", không tự gán ngày/tháng.
      - Tinh chỉnh tiếp theo theo phản hồi người dùng: tooltip Phân loại Quy định bám tọa độ chuột liên tục bằng MotionValue/transform (không đợi đổi mốc, không đổi bên ở giữa biểu đồ), căn giữa phía trên con trỏ và giới hạn trong khung/viewport. Đường dóng và điểm đánh dấu chuyển mốc bằng transform 200ms `--ease-out`, tiếp tục từ vị trí hiện tại khi đảo chiều. Lần rê vào đầu đặt đúng điểm ngay; rời chuột giữ vị trí cuối lúc fade-out. Bàn phím và reduced motion không trượt vị trí. Tham khảo cấu hình thực tế `assets/js/theme.js` của Falcon: tooltip `transitionDuration: 0`, axis pointer cập nhật 200ms.
      - Đoạn trích luật `.cl-legal-quote` trong popup hỏi đáp đã bỏ viền đỏ trái, dùng đúng bóng đổ người dùng gửi: `rgba(0,0,0,.05) 0px 6px 24px 0px, rgba(0,0,0,.08) 0px 0px 0px 1px`. Đã build và chạy lại 5 test thống kê thành công, gồm test đo tooltip di chuyển trong cùng một mốc và các frame đường dóng chuyển điểm; kiểm tra ảnh popup mới.
    * Màu sắc & Hiệu ứng: Tông đỏ burgundy `#800020`, kem `#f8f7f4`, viền `#e8e2de`, hiệu ứng Motion fade in up nhẹ nhàng, micro-interactions hover nổi bóng tinh tế.
  + Kiểm tra lượt sửa 28/09/2026: `npm run build` đạt; Vite còn cảnh báo chunk lớn hơn 500kB. Bốn test `e2e/admin-stats.spec.ts` đạt: bố cục cột, chọn/ghim điểm và bàn phím, đo các frame thẻ nở, nền không dịch chuyển, đóng sớm/đóng bằng nền/Escape, trả focus, mở bằng Enter, responsive 440×956 với motion bình thường và 834×1194 với reduced motion. Đã xem ảnh desktop/mobile trong `frontend/test-results/` (không commit). Lượt này không chạy lại toàn bộ suite hoặc push; giữ thay đổi Antigravity có sẵn ở `admin-data.ts`, `AdminUsersPage.tsx` và tài liệu.
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

- Đợt cập nhật giao diện quản trị hiện tại được người dùng yêu cầu commit và push lên `origin/main`; thông điệp commit dùng tiếng Việt **không dấu**: `Hoan thien thong ke bao cao va dong bo hieu ung cac trang quan tri`. Bao gồm trang thống kê/dữ liệu mẫu, biểu đồ tương tác, popup hỏi đáp, hover đồng bộ, Fade In Up cho người dùng/ma trận quyền hạn và quy ước animation cho trang mới. Build đã đạt; 5 test thống kê đạt sau khi tích hợp điều hướng tab; các thao tác chuyển tab/bộ lọc/bàn phím/mobile đã kiểm tra riêng trên Edge. Danh sách 14 file thay đổi chỉ gồm mã nguồn, test và tài liệu; kiểm tra không phát hiện mẫu khóa bí mật, `.env`, dump SQL, skills và kết quả kiểm tra vẫn được bỏ qua. Đối chiếu `HEAD` và `origin/main` để xác nhận trạng thái push thực tế.

Chỉ đưa mã nguồn, SQL tạo cấu trúc và tài liệu dự án lên GitHub. Bản dump `database/cyberlaw_search.sql` và bản Desktop giữ local; các liên kết tới dump trong tài liệu chỉ dùng trên máy đã tạo file. Không đưa mật khẩu, `.env`, khóa riêng, backup hoặc dữ liệu tài khoản lên repository. `database/schema.sql` là tệp cấu trúc dùng khi clone dự án sang máy khác.
