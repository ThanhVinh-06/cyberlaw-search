# Rà soát bảo mật — thống kê và báo cáo quản trị — 02/10/2026

## Phạm vi

`GET /api/admin/statistics`, truy vấn tổng hợp từ `nguoi_dung`, `van_ban`, `dieu_khoan`, `quy_dinh`, `hoi_thoai`, `tin_nhan`, `trich_dan` và phần frontend dashboard.

## Kết quả

| Kiểm soát | Kết quả | Bằng chứng |
|---|---|---|
| Chỉ admin active đọc được | PASS | middleware `account.active`, `role.admin`, Gate `quan_ly_van_ban`; `AdminStatisticsTest` |
| Không đọc văn bản nháp/luật ngoài phạm vi | PASS | thống kê tri thức lọc `116/2025/QH15` và `published` |
| Không trả password/token/chat riêng đầy đủ | PASS | response chỉ metadata tổng hợp; câu hỏi gần đây chỉ nằm trong endpoint admin |
| Injection qua bộ lọc/tham số | PASS | endpoint không nhận SQL/sort từ client; query builder và allowlist nội bộ |
| Giới hạn dữ liệu | PASS | nhóm, top 5, câu hỏi gần đây tối đa 5; không trả toàn bộ bảng |
| Log/audit | PASS | `admin.statistics.viewed` chỉ ghi request ID, actor ID và route |
| Responsive/animation | PASS | `admin-stats.spec.ts` 6/6, `admin-responsive.spec.ts` 9/9; các mốc 320, 440, 834, 900, 901, 956, 1024, 1440px |
| Dependency/DAST/load production | NOT RUN | không đổi dependency, chưa có staging/production để chạy |

## Giới hạn

Bảng hiện chưa có nhật ký tra cứu pháp luật riêng, vì vậy trường `tra_cuu` trả `null` (chưa thu thập) thay vì dựng số liệu giả. Khi cần biểu đồ tra cứu thật, phải bổ sung sự kiện thống kê đã allowlist và chính sách lưu giữ trước.
