# Rà soát bảo mật — khách vãng lai dùng trợ lý AI — 02/10/2026

- **Ngày, người/agent kiểm tra:** 02–03/10/2026, agent Claude Code (theo yêu cầu chủ dự án).
- **Commit/base và file chưa commit liên quan:** trên nền `0c561c7`; các file đang sửa: `backend/api/app/Services/LocalAnswer.php`, `app/Providers/AppServiceProvider.php`, `app/Http/Middleware/ActiveAccount.php`, `app/Support/PermissionMatrix.php`, `app/Http/Controllers/AdminStatisticsController.php`, `routes/web.php`, `database/schema.sql`, `database/migrations/20261002_hoi_thoai_khach_vang_lai.sql`, `tests/Feature/{LocalAnswerTest,AdminStatisticsTest,HistoryTest,AdminUserTest}.php`.
- **Phạm vi route/dữ liệu/vai trò, ranh giới tin cậy:** `POST /api/answer` (khách + user + admin), `GET/DELETE /api/history*` (chỉ user/admin), trang thống kê admin. Dữ liệu: `hoi_thoai`, `tin_nhan`, `trich_dan`, `nhat_ky_quan_tri`. Ranh giới tin cậy: trình duyệt khách (không đăng nhập) → Laravel; Laravel → Python retriever (không tool/network/DB).
- **Môi trường/URL test được phép, phiên bản tool, dữ liệu giả:** SQLite in-memory (`SESSION_DRIVER=array`) trong `backend/api`; tài khoản giả, luật fixture. Không truy cập MySQL phát triển, không dùng email người thật.
- **Thay đổi cần bảo vệ và mã CL/API/LLM liên quan:** nới `chat_ai_cyberlaw.khach` → `true`; `hoi_thoai.ma_nguoi_dung` cho phép `NULL`; neo danh tính khách bằng session server-side; hạn mức riêng cho khách; nhãn "Khách vãng lai" ở trang thống kê.

## Kết quả

| Kiểm tra | Cách chạy/test ID | Kết quả | Bằng chứng và giới hạn |
|---|---|---|---|
| Review code và kiểm tra đầu vào/quyền | Đọc diff `LocalAnswer`/`AppServiceProvider`/`ActiveAccount`/`routes/web.php`/`AdminStatisticsController` | PASS | Gate nhận `?NguoiDung`; `account.active:guest` chỉ nới cho route AI; ownership tách nhánh user/guest |
| Khách **không** đọc lịch sử | `HistoryTest::test_guest_cannot_read_or_delete_any_history`, `test_owner_can_read_history_but_cannot_read_or_delete_another_users_thread` | PASS | Khách `GET /api/history`, `GET/DELETE /api/history/{id}` → 401; hội thoại khách còn nguyên trong DB; danh sách user không chứa tiêu đề khách |
| Khách **không** mở hội thoại của khách khác | `LocalAnswerTest::test_guest_cannot_open_another_guests_conversation` | PASS | Xoá session (khách B) rồi gửi tiếp `conversation_id` → 404, không thêm `tin_nhan` |
| Khách **không** mở/replay hội thoại của user | `LocalAnswerTest::test_guest_cannot_open_or_replay_a_users_conversation` | PASS | `conversation_id` của user → 404; replay `request_id` của user tạo hội thoại khách mới, không trả bản của user |
| User/admin **không** mở hội thoại khách (không bypass) | `LocalAnswerTest::test_cannot_append_to_another_owners_conversation_even_as_admin`, `HistoryTest::test_admin_has_no_ownership_bypass_and_blocked_account_is_rejected` | PASS | Ownership chỉ theo `ma_nguoi_dung`; `HistoryController::owned()` không có nhánh admin |
| Tài khoản bị khoá **vẫn** bị từ chối (không rơi vào nhánh khách) | `LocalAnswerTest::test_blocked_authenticated_user_is_still_rejected`, `HistoryTest::test_admin_has_no_ownership_bypass_and_blocked_account_is_rejected` | PASS | User đăng nhập rồi `trang_thai='blocked'` → 401; `ActiveAccount` chỉ trả `next()` khi `! $user instanceof NguoiDung` |
| Ma trận phân quyền là nguồn sự thật phía server | `AdminUserTest::test_permission_matrix_is_server_owned_and_admin_only` | PASS | `rules.2.khach === true` (chat), `rules.3.khach === false` (lịch sử), `version === PermissionMatrix::VERSION`; endpoint admin-only; khớp `frontend/src/lib/admin-data.ts` |
| CSRF, Origin, chống injection | `LocalAnswerTest::test_guest_injection_and_origin_are_still_rejected` | PASS | Thiếu CSRF → 419; `Origin` lạ → 403; prompt injection → `no_basis`, không tạo `trich_dan` |
| Giới hạn tài nguyên (khách không chỉ theo IP) | `LocalAnswerTest::test_guest_rate_limit_is_per_session_and_caps_by_ip`, `test_failure_is_closed_and_rate_limit_bounds_retries` | PASS | Khoá ghép session + trần theo IP, cả hai là HMAC; 4/phút, 20/giờ mỗi phiên, 40/giờ mỗi IP; `block(20,20)` khoá theo session |
| Chỉ văn bản published, snapshot không đổi giữa chừng | `LocalAnswerTest::test_rejects_stale_or_fabricated_evidence_before_saving`, `test_no_basis_draft_and_invalid_input_do_not_invent_citations` | PASS | 409/503, không ghi tin nhắn/trích dẫn |
| Log riêng tư (không lộ câu hỏi/CSRF/token) | `LocalAnswerTest::test_logs_exclude_question_and_correlate_request`, `HistoryTest::test_logs_correlate_without_private_contents` | PASS | Log chỉ có metadata + request ID; `actor_id` = `null` cho khách; canary câu hỏi không xuất hiện |
| Trang thống kê gộp khách đúng nhãn | `AdminStatisticsTest::test_guest_conversations_appear_with_guest_label` | PASS | `recent_questions.0.nguoi_gui='Khách vãng lai'`, `vai_tro='Không đăng nhập'`, `avatar='KV'`, `overview.hoi_dap_khach >= 1`; chỉ admin đọc được |
| Frontend XSS/link giao thức | React text rendering; API chỉ nhận nguồn HTTP(S) | PASS | Giữ nguyên như review 02/10; không đổi đường render |
| Dependency/secret/SAST | — | NOT RUN | Không đổi dependency trong lần này; chưa có môi trường staging và công cụ quét phù hợp |

## Phát hiện

### F1 — Trang thái phiên khách: dữ liệu session chỉ ghi khi request thành công — ĐÃ XỬ LÝ

- **Trạng thái:** đã xác nhận và đã phòng ngừa trong thiết kế.
- **Điều kiện ảnh hưởng:** nếu `HoiThoai::create()` chạy xong nhưng controller ném lỗi sau đó (ví dụ snapshot đổi), transaction rollback xoá hội thoại — nhưng id đã ghi vào session sẽ là tham chiếu mồ côi.
- **Cách sửa:** `rememberGuestThread()` được gọi **bên trong** closure transaction (`LocalAnswer::answer()`), và Laravel chỉ ghi dữ liệu session khi response kết thúc bình thường. Rollback ⇒ không có id mồ côi. Ghi chú rõ trong code.
- **Test lại:** `test_guest_cannot_open_another_guests_conversation` (session mới → 404) và các test rollback hiện có PASS.

### F2 — Nội dung chat khách được admin xem: **ngoại lệ sản phẩm có chủ đích**

- **Trạng thái:** xác nhận; đây là quyết định của chủ dự án, **không phải lỗi**.
- **Mâu thuẫn cần ghi nhận:** `docs/security/README.md:29` nêu "Admin không mặc nhiên đọc chat riêng". Hội thoại **khách vãng lai** (`ma_nguoi_dung IS NULL`) là ngoại lệ: chủ dự án yêu cầu hiện **đầy đủ** câu hỏi/câu trả lời/trích dẫn/độ tin cậy trong trang thống kê để theo dõi chất lượng trợ lý.
- **Ranh giới được giữ:** chỉ `recent_questions` hiển thị thân tin nhắn, và chỉ cho hội thoại **khách** (không chủ) cùng hội thoại **của chính admin**. Chat của người dùng đã đăng nhập khác **vẫn** chỉ chủ sở hữu xem được (`AdminStatisticsController::recentQuestions()` lọc `ma_nguoi_dung = admin OR ma_nguoi_dung IS NULL`). Quyền đọc trang thống kê vẫn admin-only.
- **Giới hạn:** cần chủ dự án xác nhận lại khi có chính sách quyền riêng tư chính thức; nếu sau này muốn ẩn thân tin nhắn khách thì chỉ cần bỏ nhánh `orWhereNull`.

## Kết luận

- **Đã sửa/đã test lại:** toàn bộ backend **116 PASS (1272 assertions)**, gồm `LocalAnswerTest`, `HistoryTest`, `AdminUserTest`, `AdminStatisticsTest` (31 test, 351 assertions). Frontend `e2e/guest-chat.spec.ts` 15/15 PASS (gồm so khớp animation khách vs. đã đăng nhập và kiểm tra hình học dialog ở 5 kích thước).
- **Còn mở:** (1) ~~Migration `20261002_hoi_thoai_khach_vang_lai.sql` phải chạy tay trên MySQL~~ **Đã áp trên MySQL ngày 03/10/2026** và kiểm tra trực tiếp: `hoi_thoai.ma_nguoi_dung` = `IS_NULLABLE YES`; FK `ON DELETE CASCADE` và index còn nguyên; ghi thử hội thoại `NULL` trong transaction rồi rollback thành công, DB không đổi. (2) Chưa có job dọn hội thoại khách cũ (`ma_nguoi_dung IS NULL`) — cần cân nhắc lưu trữ/thời hạn.
- **Thiếu công cụ/môi trường:** chưa chạy dependency/secret/SAST trong lần này (không đổi dependency); chưa có staging để DAST.
- **Chức năng hoàn thành trong phạm vi nào?** Luồng khách hỏi đáp, lưu hội thoại có nhãn khách, hiện trong thống kê, chặn xem lịch sử — đã kiểm thử ở lớp API và UI. Migration đã áp trên MySQL (03/10/2026). **Vẫn chưa** deploy-ready vì còn mục "còn mở" ở trên (job dọn dữ liệu khách) và các kiểm soát triển khai khác chưa test.
- **Bằng chứng thô:** output test local (không commit); tài liệu này đã che dữ liệu, không chứa secret hay nội dung chat thật.
