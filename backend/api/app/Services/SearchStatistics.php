<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Đếm lượt tra cứu pháp luật công khai, gộp theo giờ (UTC).
 * Bảng chỉ có cột đếm — không lưu IP, phiên, tài khoản hay từ khóa tra cứu.
 */
final class SearchStatistics
{
    public const TABLE = 'thong_ke_tra_cuu';

    /**
     * Cộng thêm một lượt tra cứu cho giờ hiện tại.
     * Lỗi ghi đếm không được làm hỏng kết quả tìm kiếm (fail-open).
     */
    public function record(): void
    {
        try {
            $hour = CarbonImmutable::now(config('app.timezone'))->startOfHour();
            $now = CarbonImmutable::now(config('app.timezone'));
            // Tạo dòng giờ nếu chưa có, rồi tăng nguyên tử. Hai bước chạy được trên
            // cả MySQL lẫn SQLite và vẫn an toàn khi nhiều request cùng giờ.
            DB::table(self::TABLE)->insertOrIgnore([
                'gio' => $hour, 'so_luot' => 0, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now,
            ]);
            DB::table(self::TABLE)->where('gio', $hour)->increment('so_luot');
        } catch (\Throwable) {
            // Bảng thiếu hoặc DB lỗi: bỏ qua, không lộ chi tiết và không ảnh hưởng tìm kiếm.
        }
    }

    /** Tổng lượt tra cứu trong khoảng [start, end). Trả 0 khi chưa có dữ liệu. */
    public function sumBetween(CarbonInterface $start, CarbonInterface $end): int
    {
        try {
            return (int) DB::table(self::TABLE)
                ->where('gio', '>=', $start)
                ->where('gio', '<', $end)
                ->sum('so_luot');
        } catch (\Throwable) {
            return 0;
        }
    }
}
