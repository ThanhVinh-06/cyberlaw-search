# Chuẩn bị backend theo Luật An ninh mạng 2025

**Tiến độ mới 30/09/2026:** tài khoản gồm login/register/reset/xác minh email đã có backend; bộ nguyên bản 116/2025 đã chuẩn hóa và nạp MySQL draft (1 văn bản, 434 đơn vị, 60 từ khóa, 1.326 liên kết, 434 nhãn quy định). Xem [dữ liệu và giới hạn](../data/01-du-lieu-luat-116.md). Database 12 bảng/111 cột; collation điểm d/đ đã sửa bằng migration do chủ dự án chạy. Chưa công bố/AI/CRUD quản trị/thư viện thật; ưu tiên trạng thái mới này và HANDOFF thay cho bảng kế hoạch lịch sử bên dưới.

Cập nhật 29/09/2026. Đây là kết quả rà soát và kế hoạch triển khai, chưa phải các API đã chạy.

**Yêu cầu bổ sung chuẩn bị deploy:** áp dụng [quy trình bảo mật](../security/README.md) và skill `.agent/cyberlaw-security/` cho mỗi chức năng; test quyền/đầu vào/log, sửa và test lại trước khi báo hoàn thành. Backend phải có [log và audit](../security/03-logging.md); khi triển khai audit bền vững, đánh giá bổ sung bảng audit/outbox bằng migration thay vì giả định log file và DB luôn cùng commit. Các bảng cốt lõi bên dưới chưa bao gồm phần mở rộng đó.

## 1. Phạm vi đã thống nhất

- Người dùng chọn **Luật An ninh mạng số 116/2025/QH15** làm nguồn chính. Hai PDF năm 2025 là hai bản thể hiện của cùng một luật; chỉ tạo một bản ghi văn bản. Luật 2018 giữ làm tài liệu lịch sử, không đưa vào kho truy hồi mặc định.
- Đã kiểm tra lại số hiệu, ngày ban hành 10/12/2025 và ngày hiệu lực 01/07/2026 trên [Cổng thông tin Chính phủ](https://chinhphu.vn/?classid=1&docid=216499&orggroupid=1&pageid=27160). Kiểm tra metadata này chưa chứng minh toàn bộ bản trích xuất đã đúng hoặc đã rà mọi văn bản sửa đổi.
- Đề số 4 yêu cầu keyphrase, đặc tả khái niệm/dạng luật, bộ câu hỏi–trả lời, tra cứu quy định và ngữ nghĩa đơn giản. Đăng nhập/CRUD là phần hỗ trợ; không thay thế phần AI khi bảo vệ.
- Đề gốc liệt kê một số lĩnh vực khác, chưa nêu an ninh mạng. Giữ lựa chọn của người dùng để triển khai; việc giảng viên chấp nhận chủ đề là thông tin chưa có bằng chứng trong repository.

## 2. Đã sẵn sàng và còn thiếu

| Phần | Kết quả kiểm tra | Việc còn lại |
|---|---|---|
| Frontend | Có các màn hình công khai, tài khoản, quản trị và quên mật khẩu; dùng dữ liệu demo | Thay dữ liệu mẫu bằng API, giữ trạng thái tải/lỗi/rỗng và thiết kế đã duyệt |
| Database | Schema 11 bảng, 101 cột; migration 20260930 (khớp frontend, thêm nhat_ky_quan_tri) đã áp dụng lên DB dev 30/09/2026 | Ánh xạ Laravel, migrations/baseline cho DB có sẵn; không chạy lại CREATE hoặc xóa DB |
| Luật nguồn | Bản trích xuất web có đủ 45 tiêu đề điều liên tiếp và 8 tiêu đề chương | Kiểm tra cấu trúc chỉ là kiểm kê; vẫn phải đối chiếu từng nội dung, khoản/điểm với bản scan chính thức |
| Tri thức đã duyệt | `data/processed/` chưa có dữ liệu | Làm sạch, chia điều khoản, gắn căn cứ, duyệt rồi mới xuất bản/lập chỉ mục |
| Backend | Chưa có mã PHP/Python triển khai | Khởi tạo Laravel/FastAPI và cấu hình môi trường |
| Môi trường | Python 3.11.9; MySQL 8.0.44 đã được kiểm tra ở đợt DB | PHP nằm ở `C:\xampp\php\php.exe` (8.2.12, không có trong PATH); Composer 2.10.3 chạy bằng `composer.phar` ngoài repo. Đã cài Laravel 12 (30/09/2026) |
| AI và đánh giá | Chưa có mô hình, chỉ mục hoặc tập QA đã duyệt | Baseline từ khóa, ngữ nghĩa, bộ QA và đánh giá căn cứ |

Không dùng dữ liệu mẫu trong `admin-data.ts` và `knowledge-data.ts` để seed dữ liệu pháp luật thật. Một số phản hồi thống kê còn viện dẫn luật 2018/nghị định khác; phải thay khi nối dữ liệu năm 2025. Không dùng các phần trăm minh họa trên dashboard làm kết quả đánh giá AI.

## 3. Kiến trúc triển khai đề xuất

```text
React → Laravel/PHP → MySQL
              ↓
         FastAPI/Python → Bản tri thức đã duyệt + chỉ mục
```

- Laravel quản lý tài khoản, phiên, quyền, CRUD, văn bản, lịch sử và trích dẫn. Frontend chỉ gọi Laravel.
- Python nhận câu hỏi và phiên bản tri thức; thực hiện chuẩn hóa, keyphrase, truy hồi và trả đáp án có căn cứ. Không cần truy cập bảng mật khẩu hoặc toàn bộ lịch sử người dùng.
- Dự kiến đặt Laravel trong `backend/api/`, FastAPI trong `backend/ai/`. Khung `backend/app/` hiện còn trống, chưa phải dịch vụ đang chạy.
- **Đã chốt (30/09/2026): Laravel 12 trên PHP 8.2**, không nâng PHP. Khi nào muốn Laravel 13 phải nâng PHP lên 8.3+ và đọc kỹ hướng dẫn nâng cấp. Nếu dùng Laravel 13, cần PHP từ 8.3 và các extension theo [tài liệu triển khai](https://laravel.com/framework/docs/13.x/deployment#server-requirements), thêm driver MySQL phù hợp. Chốt dependency và lockfile khi cài; chưa chọn model embedding/nhà cung cấp LLM trước khi kiểm tra tài nguyên máy.
- Xác thực SPA bằng cookie/session theo [Sanctum](https://laravel.com/framework/docs/13.x/sanctum#spa-authentication), dùng CSRF và cấu hình cùng origin qua proxy khi phát triển. Thay phiên demo `sessionStorage` bằng API lấy tài khoản hiện tại; server quyết định quyền.

## 4. Nhóm API cần làm

Đây là hợp đồng dự kiến; API nghiệp vụ dùng tiền tố `/api/v1`. Tên trường JSON theo schema tiếng Việt không dấu; tên route là quy ước triển khai.

| Nhóm | API dự kiến | Quyền và hành vi |
|---|---|---|
| Tài khoản | `POST /auth/register`, `/auth/login`, `/auth/logout`; `GET /auth/me` | Đăng ký luôn gán user; trả thông tin tài khoản không kèm mật khẩu/mã xác nhận |
| Quên mật khẩu | `POST /auth/password/send-code`, `/verify-code`, `/reset` | Mã gửi qua email, xác nhận ở server, cấp quyền đặt lại tạm thời; chỉ sử dụng một lần |
| Văn bản | `GET /documents`, `/documents/{id}`, `/provisions/{id}`, `/concepts` | Khách được xem nội dung đã công bố; bản đầu lọc luật 116/2025/QH15 |
| Tra cứu | `POST /search` | Tìm số điều, từ khóa, ngữ nghĩa; trả đoạn trích, ID căn cứ và phiên bản |
| Hỏi đáp | `POST /answer` | Đề xuất yêu cầu đăng nhập như tài liệu quyền hiện có; có trạng thái thiếu căn cứ/ngoài phạm vi |
| Lịch sử | `GET /conversations`, `/conversations/{id}`; `DELETE /conversations/{id}` | Chỉ chủ sở hữu; admin không mặc nhiên đọc hội thoại người khác |
| Quản trị | CRUD `/admin/users`, `/admin/documents`, `/admin/provisions`, `/admin/concepts`, `/admin/rules` | Kiểm tra admin trên mọi API; kiểm tra liên kết trước xóa và bảo vệ admin hoạt động cuối cùng |
| Công bố/Thống kê | Thao tác công bố/lưu trữ văn bản, `GET /admin/statistics` | Duyệt nội dung và kiểm tra phiên bản chỉ mục; thống kê chỉ từ dữ liệu thật |

Phân trang/lọc/giới hạn đầu vào ở server; lỗi form trả 422 với trường tương ứng, chưa đăng nhập 401, thiếu quyền 403, giới hạn tần suất 429, dịch vụ AI không sẵn sàng trả lỗi có thể thử lại. Khi AI lỗi, thư viện/tra cứu trực tiếp vẫn dùng được. Không tự gửi lại tác vụ ghi hoặc tính phí nếu chưa có cơ chế chống trùng.

## 5. Những điểm dữ liệu phải xử lý đúng

1. **Phân quyền:** giữ hai vai trò `user`/`admin`, Policies/Gates theo thiết kế hiện có. Ma trận quyền hiện là minh họa, chưa có bảng quyền động; nếu muốn sửa và lưu quyền từng ô thì đó là phạm vi bổ sung, không giả vờ đã hỗ trợ bằng cột `vai_tro`.
2. **Mật khẩu:** dùng bảng reset mới và cột `nguoi_dung.mat_khau` đã băm. OTP, thời gian chờ, lượt sai và token đặt lại phải được kiểm tra ở PHP, không tin trạng thái từ React. Email gửi thử trong môi trường phát triển phải được phân biệt với gửi thật.
3. **Duyệt:** bản đầu duyệt ở cấp văn bản bằng `draft/published/archived`. Chỉ đưa bản đã công bố vào kết quả; không công bố chỉ vì upload PDF thành công. Thông tin người duyệt/đối chiếu có thể giữ trong manifest dữ liệu để tránh thêm workflow phức tạp lúc này.
4. **Vị trí nguồn:** bản scan có 37 trang, bản xuất web 41 trang. `trang_nguon` phải khớp chính file được liên kết; không dùng số trang web để mở bản scan. Giữ hash và nguồn trong manifest.
5. **Chia điều khoản:** giữ câu dẫn, điều kiện, ngoại lệ, thứ tự khoản/điểm. Điều 43 có phần sửa luật khác và Điều 45 có chuyển tiếp; bộ tách không được coi điều được trích bên trong là điều mới của văn bản gốc.
6. **Phiên bản:** tăng `phien_ban_noi_dung` khi đổi tri thức; xuất bộ dữ liệu có ID và phiên bản cho Python. Nếu chỉ mục không khớp nội dung, chưa phục vụ kết quả AI đó; không trộn chỉ mục cũ với văn bản mới.
7. **Trích dẫn:** kiểm tra ID, phiên bản, nội dung nguồn trước khi lưu câu trả lời. Giữ bản chụp trong `trich_dan`; không dùng điểm tương đồng làm phần trăm đúng pháp luật.
8. **Thống kê:** đếm tài khoản/văn bản/hội thoại theo truy vấn và quyền phù hợp. Độ chính xác AI chỉ xuất hiện khi có tập đánh giá, công thức và kết quả đo. Không hiển thị câu hỏi riêng của mọi người lên trang admin chỉ vì đã có widget mẫu.

Mười một bảng hiện có đủ làm nghiệp vụ cốt lõi, gồm `nhat_ky_quan_tri` được bổ sung ngày 30/09/2026. Bảng audit chưa đồng nghĩa cơ chế ghi/export log đã triển khai. Quyền động, phản hồi đánh giá hoặc phiên bản lịch sử đầy đủ vẫn cần thiết kế thêm nếu được chọn làm chức năng thật.

## 6. Thứ tự triển khai và điều kiện hoàn thành

1. **Nền PHP/MySQL** (*đã xong phần khởi tạo 30/09/2026: Laravel 12, 11 model, kết nối DB bằng user `cyberlaw_app`; xem `backend/README.md`; còn lại: baseline migration nếu cần*): kiểm tra PHP/Composer; khởi tạo Laravel; ánh xạ schema tiếng Việt, baseline DB hiện có và cấu hình mẫu không chứa bí mật. Đạt khi migration trên DB mới và kết nối DB hiện có đều an toàn.
2. **Tài khoản:** đăng ký/đăng nhập/đăng xuất, phân quyền, khôi phục mật khẩu và gửi mã. Đạt khi giữ phiên qua chuyển trang/tải lại, chặn user gọi API admin, chặn tài khoản khóa, mã hết hạn/tái sử dụng bị từ chối.
3. **Quản trị và kho luật:** CRUD, nhập nội dung 2025 đã duyệt, nguồn PDF, thư viện và thuật ngữ. Đạt khi xem/tra cứu đúng nguyên văn và xóa/sửa không làm hỏng liên kết.
4. **Truy hồi Python:** baseline TF-IDF/keyphrase rồi thêm embedding; so sánh trên bộ câu hỏi có căn cứ. Hỏi số điều trực tiếp trước, giữ từ phủ định; trả thiếu căn cứ thay vì đoán. Khóa phạm vi đúng luật 2025.
5. **Hỏi đáp và lịch sử:** Laravel gọi Python, kiểm tra nguồn, lưu hội thoại riêng và citation. Có thể trả lời bằng mẫu/trích đoạn trước; LLM diễn đạt bổ sung sau khi truy hồi ổn.
6. **Đánh giá/báo cáo:** tập xây dựng/phát triển/kiểm thử riêng theo nhóm câu hỏi; đo truy hồi và độ hỗ trợ của căn cứ, kiểm tra câu ngoài phạm vi. Chạy kiểm thử API và responsive của từng luồng sau khi tích hợp.

Có thể làm tài khoản trước khi duyệt hết dữ liệu luật. Khung Laravel 12 đã có; bước tiếp theo là **Sanctum SPA, log, API tài khoản và nối xác thực thật vào giao diện hiện có**. Đọc [kết quả tiếp nhận khung backend](../security/reviews/2026-09-30-backend-handoff.md) trước khi làm. Chưa đưa AI trả lời toàn văn cho đến khi có kho đã duyệt và kết quả đánh giá.
