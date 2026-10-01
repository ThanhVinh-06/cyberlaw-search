<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Tests\Support\KnowledgeSchema;
use Tests\TestCase;

final class PublicLibraryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        KnowledgeSchema::create();
        $now = now();
        DB::table('van_ban')->insert([
            'so_hieu' => '116/2025/QH15', 'tieu_de' => 'Luật An ninh mạng',
            'co_quan_ban_hanh' => 'Quốc hội', 'ngay_ban_hanh' => '2025-12-10',
            'ngay_hieu_luc' => '2026-07-01', 'lien_ket_nguon' => 'https://example.test/source',
            'duong_dan_tep' => 'private/source.pdf', 'trang_thai' => 'draft',
            'phien_ban_noi_dung' => 1, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now,
        ]);
        DB::table('van_ban')->insert([
            'so_hieu' => '24/2018/QH14', 'tieu_de' => 'Luật cũ', 'trang_thai' => 'published',
            'phien_ban_noi_dung' => 1, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now,
        ]);
        DB::table('dieu_khoan')->insert([
            ['ma_van_ban' => 1, 'chuong' => 'Chương I', 'so_dieu' => '1', 'so_khoan' => '1', 'ky_hieu_diem' => '', 'tieu_de' => 'Phạm vi điều chỉnh', 'noi_dung' => 'Nội dung Điều 1.', 'thu_tu' => 1, 'trang_nguon' => 1, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now],
            ['ma_van_ban' => 1, 'chuong' => 'Chương I', 'so_dieu' => '1', 'so_khoan' => '2', 'ky_hieu_diem' => '', 'tieu_de' => 'Phạm vi điều chỉnh', 'noi_dung' => 'Nội dung khoản 2.', 'thu_tu' => 2, 'trang_nguon' => 1, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now],
            ['ma_van_ban' => 1, 'chuong' => 'Chương II', 'so_dieu' => '2', 'so_khoan' => '1', 'ky_hieu_diem' => '', 'tieu_de' => 'Giải thích từ ngữ', 'noi_dung' => 'Nội dung Điều 2.', 'thu_tu' => 3, 'trang_nguon' => 2, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now],
            ['ma_van_ban' => 2, 'chuong' => 'Cũ', 'so_dieu' => '1', 'so_khoan' => '1', 'ky_hieu_diem' => '', 'tieu_de' => 'Không công bố', 'noi_dung' => 'Không được trả.', 'thu_tu' => 1, 'trang_nguon' => 1, 'ngay_tao' => $now, 'ngay_cap_nhat' => $now],
        ]);
    }

    public function test_index_is_empty_until_the_law_is_published_and_groups_articles(): void
    {
        $this->getJson('/api/library')->assertOk()->assertJsonPath('document', null)->assertJsonPath('articles', []);
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'published']);
        $response = $this->getJson('/api/library')->assertOk();
        $response->assertJsonPath('document.so_hieu', '116/2025/QH15')
            ->assertJsonPath('articles.0.so_dieu', '1')->assertJsonPath('articles.1.so_dieu', '2');
        $this->assertCount(2, $response->json('articles'));
        $this->assertStringNotContainsString('private/source.pdf', $response->getContent());
    }

    public function test_article_requires_published_document_and_returns_ordered_units(): void
    {
        $this->getJson('/api/library/articles/1')->assertNotFound();
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'published']);
        $response = $this->getJson('/api/library/articles/1')->assertOk();
        $response->assertJsonPath('so_dieu', '1')->assertJsonPath('units.0.so_khoan', '1')->assertJsonPath('units.1.so_khoan', '2');
        $this->getJson('/api/library/articles/99')->assertNotFound();
    }

    public function test_public_library_rejects_untrusted_pdf_path_and_does_not_leak_file(): void
    {
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'published']);
        $this->getJson('/api/library')->assertJsonPath('document.pdf', false);
        $response = $this->get('/api/library/pdf')->assertNotFound();
        $this->assertStringNotContainsString('private/source.pdf', $response->getContent());
    }

    public function test_pdf_download_and_revocation_are_checked_on_every_request(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('knowledge/test.pdf', '%PDF-1.4 test');
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['duong_dan_tep' => 'knowledge/test.pdf']);
        $this->get('/api/library/pdf')->assertNotFound();
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'published']);
        $this->get('/api/library/pdf')->assertOk()->assertDownload('van-ban-1.pdf')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Content-Security-Policy', "sandbox; default-src 'none'");
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'archived']);
        $this->get('/api/library/pdf')->assertNotFound();
        $this->getJson('/api/library/articles/1')->assertNotFound();
        $this->getJson('/api/library')->assertJsonPath('document', null);
    }

    public function test_validation_source_and_rate_limit(): void
    {
        DB::table('van_ban')->where('ma_van_ban', 1)->update(['trang_thai' => 'published', 'lien_ket_nguon' => 'javascript:alert(1)']);
        $this->getJson('/api/library')->assertJsonPath('document.source', '');
        foreach (['-1', '99999999999999999999999', "1%27OR1=1"] as $id) {
            $this->getJson('/api/library/articles/'.$id)->assertNotFound();
        }
        $this->getJson('/api/library', ['Origin' => 'https://evil.test'])->assertForbidden();
        for ($i = 0; $i < 59; $i++) $this->getJson('/api/library')->assertOk();
        $this->getJson('/api/library/articles/1')->assertStatus(429);
    }

    public function test_library_logs_request_id_without_payload(): void
    {
        $file = storage_path('framework/testing/library-'.bin2hex(random_bytes(6)).'.log');
        config(['logging.channels.application' => ['driver' => 'single', 'path' => $file]]);
        Log::forgetChannel('application');
        try {
            $response = $this->getJson('/api/library?q=PRIVATE-LIBRARY-CANARY')->assertOk();
            $log = file_get_contents($file);
            $this->assertStringContainsString('public.library.completed', $log);
            $this->assertStringContainsString($response->headers->get('X-Request-ID'), $log);
            $this->assertStringNotContainsString('PRIVATE-LIBRARY-CANARY', $log);
        } finally {
            Log::forgetChannel('application');
            if (is_file($file)) unlink($file);
        }
    }
}
