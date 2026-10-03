# Báo cáo lỗ hổng bị làm mất trong đợt sửa hiệu ứng skeleton — 03/10/2026

**Trạng thái: ✅ ĐÃ ĐÓNG (04/10/2026)** — Antigravity đã khôi phục xong B4 và M5; Claude Code
đã kiểm chứng lại trên mã + bundle + test. Bản mô tả lỗi gốc giữ bên dưới để làm hồ sơ.
Bằng chứng khắc phục đầy đủ ở [`2026-10-03-sua-b3-b4.md`](2026-10-03-sua-b3-b4.md).

**Người viết:** Claude Code (phiên rà soát trước khi push)
**Bối cảnh:** Chủ dự án nhờ Antigravity thêm hiệu ứng chờ nạp dữ liệu (skeleton) cho trang
Thống kê & Báo cáo, đồng bộ nút "Tải lại ma trận". Antigravity đã làm phần skeleton **tốt**,
nhưng dựng đè lên bản làm việc **trước** đợt sửa B3/B4 cùng ngày, nên **xoá mất hai bản sửa
bảo mật B4 và M5**.

## Kết quả kiểm chứng sau khi Antigravity sửa (04/10/2026)

| Hạng mục | Kết quả |
|---|---|
| `AdminStatsPage.tsx:68` | `useState<AdminStatistics \| null>(null)` — đã về `null` ✅ |
| `AdminStatsPage.tsx:85` | `.catch` gọi `setStatistics(null)` + `setStatisticsError(...)` ✅ |
| `AdminStatsPage.tsx:54-55` | helper `soLuong` trả `"—"` khi rỗng ✅ |
| `AdminStatsPage.tsx:194,225,256,287` | `.cl-stats-empty-inline` "Chưa có dữ liệu" ✅ |
| `AdminStatsPage.tsx:370` | biểu đồ rỗng `.cl-stats-empty-notice` "Chưa có dữ liệu truy vấn" ✅ |
| `RecentQuestionsCard.tsx:290`, `RegulationBreakdownCard.tsx:352` | mặc định `items = []` ✅ |
| `AdminStatsPage.tsx:491-500` (M5) | thẻ hồ sơ lấy `currentUser` từ `useAuth()`, không còn email/hardcode ✅ |
| Bundle `dist/assets/index-*.js` | `admin@cyberlaw.vn` 0, `admin12345` 0, `Super Admin` 0, `Quản trị viên Hệ thống` 0, `Lê Hoàng Long` 0, `1.280`/`3.450`/`4.430` 0 ✅ |
| Test chống tái phát | `admin-stats.spec.ts:330` (API 503) + 5 viewport rỗng; `admin-access-denied.spec.ts` (2 test) ✅ |
| `npm run build` / `tsc --noEmit` / `typecheck:e2e` | PASS ✅ |
| Playwright toàn bộ | **158 passed (12.8m), exit 0** ✅ |
| PHPUnit | **121 PASS (1296 assertions)** ✅ |

**Ghi chú còn lại (không chặn push):** `HANDOFF.md` mục *"Sửa B3 và B4"* (dòng ~42) vẫn ghi
bằng chứng bundle theo tên tệp cũ `index-Dwft0ODx.js`; tên tệp đổi mỗi lần build nên chỉ là
chi tiết lịch sử, không sai về nội dung. File review này cũng không được `HANDOFF.md` trỏ tới.

---

## Hồ sơ lỗi gốc (giữ nguyên để tham chiếu)

### B4 — Số liệu demo vẫn hiện khi API lỗi (mức **HIGH**)

Khi API `/api/admin/statistics` lỗi 500 hoặc mất mạng, trang Thống kê vẫn vẽ **1.280 người
dùng / 3.450 hỏi đáp / 4.430 lượt tra cứu** như số thật, chỉ kèm một dòng `role="alert"` nhỏ.
Admin không phân biệt được đâu là số thật.

**Vị trí đã sai (trước khi sửa):**

| Vị trí | Nội dung sai |
|---|---|
| `AdminStatsPage.tsx:27-34` | import `thongKeTongQuanData`, `thongKeTheoThangData`, `nhomQuyDinhData`, `danhSachCauHoiGanDay`, `danhSachNguoiDungNoiBat`, `tyLeTrichDanData` từ `@/lib/admin-data` |
| `AdminStatsPage.tsx:65-76` | `useState<AdminStatistics>(() => ({ … overview: thongKeTongQuanData, … }))` — khởi tạo bằng dữ liệu demo |
| `AdminStatsPage.tsx:91-95` | `.catch` **chỉ** gọi `setStatisticsError(...)`, **không** reset về rỗng |
| `AdminStatsPage.tsx:102` | `const overview = statistics.overview;` — không có nhánh rỗng |
| `AdminStatsPage.tsx:184, 259, 271` | đọc thẳng số demo qua `toLocaleString(...)` |
| `RecentQuestionsCard.tsx:290` | `items = danhSachCauHoiGanDay` |
| `RegulationBreakdownCard.tsx:352` | `items = nhomQuyDinhData` |

**Bằng chứng bundle lúc đó** (`frontend/dist/assets/index-A6yWCEgW.js`):

```
Lê Hoàng Long            2
admin@cyberlaw.vn        1
Super Admin              1
Quản trị viên Hệ thống   1
```

### M5 — Thẻ hồ sơ admin hardcode lại (mức **MEDIUM**, đường rò của B3)

`AdminStatsPage.tsx:457-464` hardcode `Quản trị viên Hệ thống` / `@admin • admin@cyberlaw.vn` /
`Super Admin`. Đây **chính là đường rò `admin@cyberlaw.vn` còn lại trong bundle** — xoá khối ở
`AdminAccessDenied.tsx` là chưa đủ.

### Bài học

Hai AI cùng sửa một cây làm việc không có nhánh riêng thì bản sửa **chưa commit** dễ bị mất
im lặng. Trước khi push phải **đọc lại mã thật và build lại bundle** rồi quét chuỗi mẫu, không
tin mô tả trong `HANDOFF.md`.
