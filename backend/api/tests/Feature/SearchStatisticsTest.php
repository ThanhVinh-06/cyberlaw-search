<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\KnowledgeSchema;
use Tests\TestCase;

/**
 * Bộ đếm lượt tra cứu: chỉ đếm GET /api/search thành công, gộp theo giờ, không PII.
 */
final class SearchStatisticsTest extends TestCase
{
    private const TABLE = 'thong_ke_tra_cuu';

    protected function setUp(): void
    {
        parent::setUp();
        KnowledgeSchema::create();
        config(['logging.channels.application' => config('logging.channels.null')]);
        DB::table('van_ban')->insert([
            'so_hieu' => '116/2025/QH15', 'tieu_de' => 'Luật An ninh mạng', 'trang_thai' => 'published',
            'phien_ban_noi_dung' => 1, 'ngay_tao' => now(), 'ngay_cap_nhat' => now(),
        ]);
        DB::table('dieu_khoan')->insert([
            'ma_van_ban' => 1, 'so_dieu' => '2', 'so_khoan' => '1', 'ky_hieu_diem' => '', 'tieu_de' => 'Giải thích từ ngữ',
            'noi_dung' => 'An ninh mạng là sự ổn định của không gian mạng.', 'thu_tu' => 1, 'ngay_tao' => now(), 'ngay_cap_nhat' => now(),
        ]);
    }

    public function test_each_successful_list_search_adds_one_and_is_grouped_by_hour(): void
    {
        $this->getJson('/api/search?q=an+ninh')->assertOk();
        $this->getJson('/api/search')->assertOk();
        $this->getJson('/api/search?q=an+ninh&page=2')->assertOk();

        // Ba lượt trong cùng một giờ gộp vào đúng một dòng.
        $this->assertSame(1, DB::table(self::TABLE)->count());
        $this->assertSame(3, (int) DB::table(self::TABLE)->value('so_luot'));
    }

    public function test_only_the_list_endpoint_is_counted(): void
    {
        $this->getJson('/api/search')->assertOk();
        $baseline = (int) DB::table(self::TABLE)->value('so_luot');

        $this->getJson('/api/search/1')->assertOk();
        $this->getJson('/api/library')->assertOk();
        $this->getJson('/api/terms')->assertOk();

        // Chi tiết điều khoản, thư viện và thuật ngữ không phải lượt tra cứu danh sách.
        $this->assertSame($baseline, (int) DB::table(self::TABLE)->value('so_luot'));
    }

    public function test_counter_stores_no_pii_or_query_text(): void
    {
        $this->getJson('/api/search?q='.rawurlencode('PRIVATE-COUNTER-CANARY'))->assertOk();

        $this->assertSame(
            ['ma_thong_ke', 'gio', 'so_luot', 'ngay_tao', 'ngay_cap_nhat'],
            Schema::getColumnListing(self::TABLE),
        );
        $row = DB::table(self::TABLE)->first();
        $this->assertStringNotContainsString('PRIVATE-COUNTER-CANARY', json_encode($row, JSON_UNESCAPED_UNICODE));
        // Bảng chỉ có cột đếm theo giờ; không có cột IP, phiên, tài khoản hay từ khóa.
        $this->assertSame(1, (int) $row->so_luot);
        $this->assertSame(0, (int) date('i', strtotime((string) $row->gio)));
        $this->assertSame(0, (int) date('s', strtotime((string) $row->gio)));
    }

    public function test_counting_failure_is_open_and_does_not_break_search(): void
    {
        Schema::drop(self::TABLE);

        // Bảng thiếu: ghi đếm lỗi nhưng tìm kiếm vẫn phục vụ bình thường.
        $this->getJson('/api/search?q=an+ninh')->assertOk()->assertJsonPath('total', 1);
    }
}
