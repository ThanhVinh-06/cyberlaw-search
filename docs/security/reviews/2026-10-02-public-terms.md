# Rà soát bảo mật: Từ điển thuật ngữ

| Before | After | Why |
|---|---|---|
| Tab hiển thị hai thuật ngữ mẫu trong frontend | `GET /api/terms` đọc `tu_khoa` qua điều khoản/văn bản đã công bố | Không hiển thị căn cứ chưa duyệt |
| Không có tìm kiếm thuật ngữ server-side | Query và page được validate, giới hạn 120 ký tự/1.000 trang | Giảm payload và lạm dụng tài nguyên |
| Popup dùng dữ liệu mẫu | Trả DTO điều khoản cùng nguồn HTTP(S) đã lọc | Giữ đối chiếu theo căn cứ thật |

## Kết quả

- PASS: `PublicTermsTest` 2/2, 11 assertions: chỉ bản published, tìm kiếm không dấu, validation và Origin.
- PASS: `terms.spec.ts` 1/1 ở 320/440/834/1440px; build và E2E typecheck PASS.
- PASS: API dùng rate limit công khai và SafeLog chỉ ghi event/route/request ID, không ghi query.
- CHƯA CHẠY: thiết bị thật, DAST production, MySQL dữ liệu thật và backup/restore.
