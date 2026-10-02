# Rà soát bảo mật — trường kết quả và câu trả lời ghép AI — 02/10/2026

## Phạm vi

Thay đổi bước 1 cho hỏi đáp AI: `backend/ai/retriever.py` (thêm `confidence`), `backend/api/app/Services/LocalRetriever.php` (kiểm tra biên), `backend/api/app/Services/LocalAnswer.php` (ghép câu trả lời + ghi `do_tin_cay`/`thoi_gian_xu_ly_ms`), và bước 2 nối vào `AdminStatisticsController::recentQuestions()` + badge `RecentQuestionsCard`. Test dùng SQLite trong `backend/api/storage/framework/testing`, tài khoản giả và luật fixture; không truy cập MySQL phát triển.

## Kết quả

| Kiểm soát | Kết quả | Bằng chứng |
|---|---|---|
| Câu trả lời ghép không bịa văn bản pháp lý | PASS | `composeAnswer` chỉ cắt/gộp khoảng trắng từ `noi_dung` của dòng snapshot đã duyệt; assert `answer` chứa `Điều 2`/`An ninh mang` trong `LocalAnswerTest` |
| Không rò nguyên văn ngoài phạm vi/phê duyệt | PASS | Dòng lấy từ `$snapshot['rows']` (chỉ `116/2025/QH15` + `published`); `LocalAnswerTest` chuyển văn bản sang `draft` vẫn trả 409 |
| `confidence` không vượt biên | PASS | `LocalRetriever` `abort_unless(is_int && 0..100, 503)`; `test_retriever.py::test_confidence_is_bounded_signal` |
| `do_tin_cay` chỉ gán khi có căn cứ | PASS | `LocalAnswerTest` assert `no_basis` → `do_tin_cay` NULL |
| Quyền, CSRF, tài khoản bị khóa, chống trùng | PASS (không đổi) | Không sửa route/Gate/lock/replay; `LocalAnswerTest` 7/7 |
| Prompt injection/câu hỏi ngoài phạm vi | PASS (không đổi) | `no_basis` giữ nguyên; Python không có tool/network/database |
| Log riêng tư | PASS (không đổi) | Không thêm câu hỏi/nội dung vào log; `LocalAnswerTest::test_logs_exclude_question_and_correlate_request` |
| XSS/link giao thức | PASS (không đổi) | Câu trả lời là text thuần render qua React; `answer-api.ts` vẫn lọc nguồn HTTP(S) |
| Giới hạn tài nguyên | PASS (không đổi) | Snapshot 5000 dòng/6MB, JSON 8MB, timeout process, 6/phút và 60/giờ |
| Chỉ chủ sở hữu thấy điểm của mình | PASS | `recentQuestions` vẫn lọc `h.ma_nguoi_dung = user`; `do_tin_cay`/`thoi_gian_xu_ly_ms` chỉ đọc thêm hai cột số, không lộ `noi_dung` của người khác; `AdminStatisticsTest` |
| Nhãn điểm không gây hiểu nhầm pháp lý | PASS | Badge có tooltip `confidence_note` "Điểm bằng chứng truy hồi, không phải độ chính xác pháp lý" |
| Trường thiếu (`null`) không gây lỗi/giả số | PASS | `confidenceLabel`/`durationLabel` trả "Chưa đánh giá"/"Chưa ghi nhận"; `AdminStatisticsTest::test_missing_confidence_and_duration_show_placeholders` |

## Giới hạn còn lại

`do_tin_cay` là **tín hiệu bằng chứng truy hồi** (khớp cấu trúc điều/khoản/điểm + độ phủ từ khoá), **không phải** độ chính xác pháp lý; trần 88 để tránh ngụ ý chắc chắn tuyệt đối. Chưa có LLM sinh câu trả lời, embeddings/reranker, kiểm thử tải hoặc rotation log production. Lịch sử chat của người dùng (`HistoryView`) chưa hiển thị hai trường. Không kết luận deploy-ready.
