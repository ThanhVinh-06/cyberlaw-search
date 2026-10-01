<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Support\KnowledgeSchema;
use Tests\TestCase;

final class PublicSearchTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        KnowledgeSchema::create();
        config(['logging.channels.application' => config('logging.channels.null')]);
        DB::table('van_ban')->insert([
            'so_hieu' => '116/2025/QH15', 'tieu_de' => 'Luật An ninh mạng', 'ngay_ban_hanh' => '2025-12-10',
            'ngay_hieu_luc' => '2026-07-01', 'lien_ket_nguon' => 'https://example.test/source', 'trang_thai' => 'published',
            'phien_ban_noi_dung' => 1, 'ngay_tao' => now(), 'ngay_cap_nhat' => now(),
        ]);
        DB::table('van_ban')->insert([
            'so_hieu' => '24/2018/QH14', 'tieu_de' => 'Luật cũ', 'trang_thai' => 'published',
            'phien_ban_noi_dung' => 1, 'ngay_tao' => now(), 'ngay_cap_nhat' => now(),
        ]);
        DB::table('dieu_khoan')->insert([
            ['ma_van_ban' => 1, 'so_dieu' => '2', 'so_khoan' => '1', 'ky_hieu_diem' => '', 'tieu_de' => 'Giải thích từ ngữ', 'noi_dung' => 'An ninh mạng là sự ổn định của không gian mạng.', 'thu_tu' => 1, 'trang_nguon' => 1, 'ngay_tao' => now(), 'ngay_cap_nhat' => now()],
            ['ma_van_ban' => 1, 'so_dieu' => '44', 'so_khoan' => '1', 'ky_hieu_diem' => '', 'tieu_de' => 'Hiệu lực thi hành', 'noi_dung' => 'Luật có hiệu lực từ ngày 01 tháng 7 năm 2026.', 'thu_tu' => 2, 'trang_nguon' => 20, 'ngay_tao' => now(), 'ngay_cap_nhat' => now()],
            ['ma_van_ban' => 2, 'so_dieu' => '1', 'so_khoan' => '1', 'ky_hieu_diem' => '', 'tieu_de' => 'Không công bố', 'noi_dung' => 'Văn bản lịch sử.', 'thu_tu' => 3, 'trang_nguon' => 1, 'ngay_tao' => now(), 'ngay_cap_nhat' => now()],
        ]);
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'draft']);
    }

    public function test_only_published_2025_law_is_exposed(): void
    {
        $this->getJson('/api/search?q=an+ninh+mang')->assertOk()->assertJsonPath('total', 0);
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'published']);
        $response = $this->getJson('/api/search?q=an+ninh+mang')->assertOk();
        $response->assertJsonPath('total', 2)->assertJsonPath('items.0.category', 'definition')->assertJsonPath('items.0.source', 'https://example.test/source');
        $this->getJson('/api/search/1')->assertOk()->assertJsonPath('title', 'Điều 2 khoản 1. Giải thích từ ngữ');
        $this->getJson('/api/search/3')->assertNotFound();
    }

    public function test_query_and_pagination_are_bounded_and_article_filter_is_server_side(): void
    {
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'published']);
        $this->getJson('/api/search?mode=article&q=Điều%2044&per_page=1')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('items.0.category', 'effect');
        $this->getJson('/api/search?q=' . rawurlencode(str_repeat('x', 121)))->assertUnprocessable();
        $this->getJson('/api/search?per_page=31')->assertUnprocessable();
        $this->getJson('/api/search?from=2026-01-01&to=2025-01-01')->assertUnprocessable();
    }

    public function test_publication_revocation_filters_and_pagination(): void
    {
        $this->getJson('/api/search/1')->assertNotFound();
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'published']);
        $this->getJson('/api/search?per_page=1&page=2')->assertOk()->assertJsonPath('items.0.id', '2')->assertJsonPath('total', 2);
        $this->getJson('/api/search?category=definition')->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/search?to=2025-12-10')->assertOk()->assertJsonPath('total', 2);
        $this->getJson('/api/search?from=2026-01-01')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/search?mode=title&q='.rawurlencode('Giải thích'))->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/search?mode=title&q='.rawurlencode('ổn định'))->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/search?q='.rawurlencode('Điều 44'))->assertOk()->assertJsonPath('items.0.id', '2');
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'archived']);
        $this->getJson('/api/search/1')->assertNotFound();
        $this->getJson('/api/search')->assertOk()->assertJsonPath('total', 0);
    }

    public function test_untrusted_inputs_and_source_urls_do_not_leak_or_execute(): void
    {
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'published', 'lien_ket_nguon' => 'javascript:alert(1)', 'duong_dan_tep' => 'private/source.pdf']);
        $result = $this->getJson('/api/search/1')->assertOk()->assertJsonPath('source', '');
        $this->assertStringNotContainsString('private/source.pdf', $result->getContent());
        foreach (["' OR 1=1 --", '%', '_'] as $q) {
            $this->getJson('/api/search?q='.rawurlencode($q))->assertOk()->assertJsonPath('total', 0);
        }
        $this->getJson('/api/search?q[]=x')->assertUnprocessable();
        $this->getJson('/api/search?mode=sql')->assertUnprocessable();
        $this->getJson('/api/search?page=-1')->assertUnprocessable();
        $this->getJson('/api/search/999999999999999999999999')->assertNotFound();
        $this->getJson('/api/search', ['Origin' => 'https://evil.test'])->assertForbidden();
    }

    public function test_public_rate_limit_is_shared_between_list_and_detail(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/search')->assertOk();
        }
        $this->getJson('/api/search/1')->assertStatus(429)->assertHeader('X-Request-ID');
    }

    public function test_search_logs_correlate_without_storing_query_text(): void
    {
        $file = storage_path('framework/testing/search-log-'.bin2hex(random_bytes(6)).'.log');
        config(['logging.channels.application' => ['driver' => 'single', 'path' => $file]]);
        Log::forgetChannel('application');
        try {
            $response = $this->getJson('/api/search?q=PRIVATE-SEARCH-CANARY')->assertOk()->assertHeader('X-Request-ID');
            $content = file_get_contents($file);
            $this->assertStringContainsString('public.search.completed', $content);
            $this->assertStringContainsString($response->headers->get('X-Request-ID'), $content);
            $this->assertStringNotContainsString('PRIVATE-SEARCH-CANARY', $content);
        } finally {
            Log::forgetChannel('application');
            if (is_file($file)) unlink($file);
        }
    }
}
