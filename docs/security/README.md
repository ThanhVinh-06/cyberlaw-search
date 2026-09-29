# Bảo mật CyberLaw Search

Cập nhật nguồn: 29/09/2026. Người dùng yêu cầu chuẩn bị deploy, viết code có kiểm soát bảo mật, ghi log và rà soát sau **mỗi chức năng**. Đây là quy ước dự án; các kiểm soát chưa triển khai phải ghi rõ, không coi có checklist là đã an toàn.

| Tài liệu | Khi dùng |
|---|---|
| [Danh mục rủi ro](01-risk-catalog.md) | Chọn lỗ hổng cần phòng ngừa theo phần đang làm |
| [Kiểm tra từng chức năng](02-feature-checklist.md) | Trước khi báo hoàn thành tính năng/sửa lỗi |
| [Ghi log](03-logging.md) | Thiết kế log PHP/Python, audit và cảnh báo |
| [Trước khi deploy](04-deployment.md) | Chuẩn bị staging/production và mỗi lần phát hành |
| [Mẫu báo cáo](review-template.md) | Bằng chứng, phát hiện, cách sửa và test lại |
| [Rà soát ban đầu](reviews/2026-09-29-baseline.md) | Giới hạn và việc cần làm trên bản hiện tại |
| [Skill dự án](../../.agent/cyberlaw-security/SKILL.md) | Hướng dẫn agent áp dụng quy ước |

## Quy trình theo yêu cầu người dùng

1. Trước code: xác định dữ liệu cần bảo vệ, ai được thao tác, đầu vào không tin cậy và cách lạm dụng chức năng.
2. Khi code: kiểm tra ở server, ghi sự kiện phù hợp, không ghi bí mật; ưu tiên cơ chế framework thay vì tự thiết kế mật mã/xác thực.
3. Sau code: review thay đổi, test nghiệp vụ và bảo mật liên quan; kiểm tra log không rò dữ liệu và responsive UI bị ảnh hưởng.
4. Sửa phát hiện đã xác nhận, chạy lại test liên quan; ghi `reviews/YYYY-MM-DD-ten-chuc-nang.md` theo mẫu. Chỉ ghi kết quả đã thực sự chạy.
5. Trước deploy: kiểm tra toàn bộ bề mặt triển khai, dependency/secret, backup/restore, cảnh báo và các mục tồn tại.

Trạng thái: **PASS** có bằng chứng; **FAIL** không đạt; **NOT RUN** chưa chạy/thiếu môi trường; **N/A** không áp dụng, có lý do. Dữ liệu demo chỉ chứng minh UI; không gán PASS cho auth server khi server chưa tồn tại.

Mức độ theo tác động/khả năng khai thác: Critical (chiếm hệ thống/rò diện rộng), High (vượt quyền/chiếm tài khoản/rò đáng kể), Medium (cần điều kiện/tác động hẹp), Low (củng cố). Advisory tự động cần đối chiếu phiên bản và đường chạy thực tế. High/Critical đã xác nhận phải sửa trước production; kiểm soát trọng yếu chưa test thì chưa kết luận sẵn sàng deploy. Vấn đề còn lại cần người phụ trách và kế hoạch xử lý.

## Ranh giới bản đầu

- Laravel sở hữu MySQL và quyền; FastAPI chỉ nhận ngữ cảnh cần cho truy hồi. Admin không mặc nhiên đọc chat riêng. Luật 2025 đã duyệt là nguồn mặc định; bản nháp/demo không được công bố nhầm.
- Backend chưa khởi tạo: logging, phiên, upload server và authorization trong tài liệu là yêu cầu, chưa chạy thật.
- Test thường dùng localhost/test DB và tài khoản giả. Quét chủ động production/dịch vụ khác cần phạm vi cho phép cụ thể; không test phá hủy trên DB phát triển đang dùng.

## Cơ sở và cập nhật

Nhóm rủi ro đối chiếu [OWASP Top 10:2025](https://top10.owasp.org/2025/), [API Security Top 10:2023](https://api-security.owasp.org/editions/2023/en/0x11-t10/) và [LLM Top 10:2025](https://genai.owasp.org/llm-top-10/). Kiểm chứng tham khảo [ASVS 5.0.0](https://owasp.org/projects/asvs); đây không phải tuyên bố đạt chứng nhận ASVS.

Top 10 là nhóm rủi ro, không liệt kê mọi CVE. Kiểm tra advisory theo lockfile khi đổi dependency và trước release; rà lại hướng dẫn mỗi quý hoặc khi đổi kiến trúc. Lưu phiên bản công cụ, ngày chạy, phạm vi để kiểm chứng kết quả.
