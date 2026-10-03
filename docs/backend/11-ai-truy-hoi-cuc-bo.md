# Hỏi đáp AI cục bộ (bản đầu)

## Phạm vi

Hỏi đáp dùng **tài khoản đã xác thực hoặc khách vãng lai** (xem mục "Khách vãng lai" bên dưới) và chỉ đọc văn bản `116/2025/QH15` có `trang_thai=published`. Laravel tạo snapshot có giới hạn, gửi JSON qua stdin cho `backend/ai/retriever.py`, rồi kiểm tra lại phiên bản trước khi lưu. Python không truy cập MySQL, mạng, shell, file nguồn hay công cụ khác.

Bản đầu là **truy hồi trích đoạn**, chưa phải mô hình sinh câu trả lời. Phản hồi nêu rõ khi chưa có căn cứ; giao diện hiển thị nguyên văn trích dẫn, số điều/khoản/điểm, phiên bản và trang nguồn. Bản nháp không được đưa vào truy hồi.

## Câu trả lời tóm lược + dẫn chiếu (từ 02/10/2026)

Khi có căn cứ, `LocalAnswer::composeAnswer()` ghép câu trả lời **một khối văn bản thuần** từ chính dòng `dieu_khoan` đã công bố trong snapshot:

> Theo Luật 116/2025/QH15, nội dung bạn hỏi được quy định tại **Điều X khoản Y điểm Z (tiêu đề)**: “<220 ký tự đầu của nguyên văn>…” — Các căn cứ nguyên văn được liệt kê bên dưới. Bạn cần đọc cả điều kiện, ngoại lệ và văn bản được dẫn chiếu trước khi áp dụng.

- Không sinh văn bản mới: chỉ cắt (`Str::limit`, 220 ký tự) và gộp khoảng trắng từ `noi_dung` của dòng đứng đầu `ids`. Toàn bộ nguyên văn vẫn nằm ở danh sách căn cứ bên dưới.
- Trả lời là **một khối, không xuống dòng**: bong bóng chat (`MainSite.tsx`) render `{message.text}` trực tiếp trong `<div className="cl-message">` (không có `white-space: pre-line`), nên dấu phân cách là ` — ` thay vì `\n\n`.
- Nhánh `no_basis` giữ nguyên câu từ chối hiện có.
- Hội thoại **cũ** vẫn giữ nguyên câu tĩnh đã lưu: lịch sử là snapshot tại thời điểm trả lời, hệ thống không viết lại.

## Hai trường kết quả trong `tin_nhan`

`LocalAnswer` ghi hai cột đã có sẵn trong schema (`database/schema.sql:151-166`, **không cần migration**):

| Cột | Nguồn | Ý nghĩa |
|---|---|---|
| `do_tin_cay` | `retriever.py` → `confidence` (0–100) | **Điểm bằng chứng truy hồi**, không phải độ chính xác pháp lý |
| `thoi_gian_xu_ly_ms` | `hrtime(true)` từ đầu `answer()` đến khi tạo tin nhắn | Thời gian xử lý một lượt trả lời (ms) |

- `confidence` là số nguyên 0–100 trong mọi nhánh của `retrieve()`: `no_basis` → `0`; khớp cấu trúc điều/khoản/điểm (`exact_reference`) → `95`; truy hồi theo độ phủ từ khoá (`relevant_excerpts`) → `min(88, max(40, round(coverage*100)))`. Trần 88 để không ngụ ý chắc chắn tuyệt đối.
- `LocalRetriever` kiểm tra biên `is_int($confidence) && 0 <= $confidence <= 100`, sai thì `503`.
- `LocalAnswer` chỉ lưu `do_tin_cay` khi `status='answered'`; nhánh `no_basis` để `null` (không có câu trả lời được chứng minh ⇒ không gán điểm). `thoi_gian_xu_ly_ms` luôn được ghi.
- Hiển thị hai trường ở **thống kê quản trị** đã nối: `AdminStatisticsController::recentQuestions()` đọc `do_tin_cay`/`thoi_gian_xu_ly_ms` và trả `do_tin_cay` dạng `"88%"` (1 chữ số thập phân), `thoi_gian_xu_ly` dạng `"0.41s"`; `null` → `"Chưa đánh giá"`/`"Chưa ghi nhận"`. Giao diện `RecentQuestionsCard` đã có sẵn hai badge và hiển thị `confidence_note` qua tooltip: *"Điểm bằng chứng truy hồi, không phải độ chính xác pháp lý"*. Lịch sử chat của người dùng (`HistoryView`) chưa hiển thị hai trường này.


## Khách vãng lai (từ 02/10/2026)

Khách **chưa đăng nhập** dùng được trợ lý AI như người đã đăng nhập, nhưng không xem lại được lịch sử của mình.

- **Danh tính = phiên trình duyệt**, không tạo tài khoản giả, không lưu PII. Session server-side (cookie đã mã hoá, nhóm `web`) giữ danh sách `ma_hoi_thoai` mà trình duyệt này đã tạo (`LocalAnswer::SESSION_KEY = 'guest_chat_threads'`, tối đa 20 id, mới nhất trước). Vượt 20 thì hội thoại cũ thoái hoá thành 404 khi nối tiếp — frontend đã reset `conversationId` khi gặp 404.
- **`hoi_thoai.ma_nguoi_dung` cho phép `NULL`** ⇒ `NULL` = hội thoại khách. Cần migration `database/migrations/20261002_hoi_thoai_khach_vang_lai.sql` chạy tay trên MySQL trước khi deploy (SQLite test không phát hiện thiếu sót này).
- **Sở hữu tách nhánh** (`LocalAnswer::owned()`): user lọc theo `ma_nguoi_dung`; khách lọc `whereNull('ma_nguoi_dung')->whereIn('ma_hoi_thoai', guestThreadIds)`. Khách A không mở được hội thoại khách B (id không có trong session A) và không mở được hội thoại của user (`whereNull`). Replay `request_id` cũng tách nhánh tương tự qua `nhat_ky_quan_tri.ma_nguoi_thuc_hien`.
- **Quyền** (`PermissionMatrix`): `chat_ai_cyberlaw.khach = true`, `xem_lich_su_chat.khach = false`. Gate nhận `?NguoiDung` để ma trận quyết định cho khách; route `POST /api/answer` dùng `account.active:guest` (chỉ nới cho route này — tài khoản bị khoá/sai fingerprint vẫn 401). `GET/DELETE /api/history*` không có `:guest` nên khách 401.
- **Hạn mức riêng**: khách 4 lần/phút và 20 lần/giờ mỗi phiên, kèm trần 40 lần/giờ mỗi IP; khoá là HMAC (session id/IP thô không vào tên file cache). Không giới hạn chỉ theo IP (yêu cầu API6). `block(20,20)` khoá theo session nên mỗi trình duyệt chỉ có một request AI đang chạy.
- **Trang thống kê**: hội thoại khách hiện đầy đủ với nhãn "Khách vãng lai" (`recent_questions`, `top_users`, `overview.hoi_dap_khach`). Đây là quyết định sản phẩm — xem `docs/security/reviews/2026-10-02-khach-vang-lai-chat.md`; chat của người dùng đã đăng nhập khác vẫn chỉ chủ sở hữu xem.
- **Không ghi nội dung câu hỏi vào log**: giữ nguyên như người dùng; `actor_id` là `null` cho khách.

## Luồng request

1. `POST /api/answer` yêu cầu session cookie, CSRF và quyền `chat_ai_cyberlaw`; tài khoản đã đăng nhập phải active, khách đi qua nhánh `account.active:guest`.
2. Validate câu hỏi 3–1000 ký tự, `request_id` UUID và `conversation_id` số nguyên dạng chuỗi.
3. Giới hạn 6 lần/phút, 60 lần/giờ mỗi tài khoản; khách 4/phút, 20/giờ mỗi phiên và 40/giờ mỗi IP. Khóa một request đang xử lý trong 30 giây (theo tài khoản hoặc phiên khách).
4. Retriever lexical tìm tối đa bốn chunk. Câu hỏi ngoài phạm vi, prompt injection và câu hỏi cần suy đoán (ví dụ mức phạt) trả `no_basis`.
5. Laravel đối chiếu ID với snapshot và hash snapshot mới; chỉ sau đó mới ghi `hoi_thoai`, `tin_nhan`, `trich_dan` và audit. Với khách, id hội thoại được ghi vào session **bên trong transaction**, nên rollback không để lại tham chiếu mồ côi.
6. Cùng `request_id` chỉ phát lại message đã lưu; dùng lại cho câu hỏi khác bị từ chối.

## Chạy cục bộ

```powershell
cd E:\cyberlaw-search\backend\ai
python -m unittest test_retriever.py
python -X utf8 evaluate.py
```

`evaluate.py` là tập phát triển nội bộ, không phải test độc lập và không chứng minh độ chính xác pháp lý. Bản thử nghiệm hiện không yêu cầu package Python hay API key; `CYBERLAW_AI_PYTHON` chỉ đổi executable khi máy dùng tên Python khác.

## Giới hạn cần xử lý trước khi deploy

- Chưa có semantic embeddings/reranker hoặc LLM diễn giải; chưa đo latency/load production.
- `do_tin_cay` là tín hiệu truy hồi (khớp cấu trúc + độ phủ từ khoá), **không phải** độ đúng pháp lý; không dùng làm căn cứ kết luận chất lượng và không hiển thị như một chỉ số chắc chắn cho người dùng cuối.
- Cần chỉ mục phiên bản hóa, pipeline phê duyệt dữ liệu và bộ đánh giá độc lập có người rà soát.
- Cần cấu hình rotation/quyền đọc log, backup audit, timeout process và giám sát disk ở môi trường triển khai.
- Không gọi endpoint này là tư vấn pháp lý; người dùng phải đối chiếu toàn văn và văn bản được dẫn chiếu.
