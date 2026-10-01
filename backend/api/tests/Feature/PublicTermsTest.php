<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\Support\KnowledgeSchema;
use Tests\TestCase;

final class PublicTermsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp(); KnowledgeSchema::create(); $now = now();
        DB::table('van_ban')->insert([
            'so_hieu'=>'116/2025/QH15','tieu_de'=>'Luật An ninh mạng','trang_thai'=>'draft',
            'phien_ban_noi_dung'=>1,'ngay_tao'=>$now,'ngay_cap_nhat'=>$now,
        ]);
        DB::table('dieu_khoan')->insert([
            'ma_van_ban'=>1,'so_dieu'=>'2','so_khoan'=>'1','ky_hieu_diem'=>'','tieu_de'=>'Giải thích từ ngữ',
            'noi_dung'=>'An ninh mạng là sự ổn định của không gian mạng.','thu_tu'=>1,'ngay_tao'=>$now,'ngay_cap_nhat'=>$now,
        ]);
        DB::table('tu_khoa')->insert([
            'cum_tu'=>'An ninh mạng','bien_the'=>json_encode(['an ninh mang']),'dinh_nghia'=>'Sự ổn định của không gian mạng.',
            'ma_dieu_khoan_dinh_nghia'=>1,'ngay_tao'=>$now,'ngay_cap_nhat'=>$now,
        ]);
    }

    public function test_terms_are_published_only_and_support_accent_insensitive_search(): void
    {
        $this->getJson('/api/terms')->assertOk()->assertJsonPath('items', [])->assertJsonPath('total', 0);
        DB::table('van_ban')->update(['trang_thai'=>'published']);
        $response = $this->getJson('/api/terms?q=an%20ninh%20mang')->assertOk();
        $response->assertJsonPath('total', 1)->assertJsonPath('items.0.cum_tu', 'An ninh mạng')
            ->assertJsonPath('items.0.article.so_dieu', '2');
        $this->assertStringNotContainsString('tu_khoa', $response->getContent());
    }

    public function test_terms_reject_untrusted_input_and_origin(): void
    {
        DB::table('van_ban')->update(['trang_thai'=>'published']);
        $this->getJson('/api/terms?q='.rawurlencode(str_repeat('x', 121)))->assertStatus(422);
        $this->getJson('/api/terms?page=0')->assertStatus(422);
        $this->getJson('/api/terms', ['Origin'=>'https://evil.test'])->assertForbidden();
    }
}
