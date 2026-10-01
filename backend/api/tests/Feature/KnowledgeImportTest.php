<?php

namespace Tests\Feature;

use App\Services\KnowledgeImport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\KnowledgeSchema;
use Tests\TestCase;

final class KnowledgeImportTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        KnowledgeSchema::create();
    }

    public function test_dry_run_writes_nothing(): void
    {
        $this->artisan('cyberlaw:import-knowledge')->assertExitCode(0);
        foreach (['van_ban', 'dieu_khoan', 'tu_khoa', 'dieu_khoan_tu_khoa', 'quy_dinh', 'nhat_ky_quan_tri'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_unreviewed_json_tampering_and_oversized_input_are_rejected(): void
    {
        $service = app(KnowledgeImport::class);
        $bytes = file_get_contents(base_path('../../data/processed/luat-116-2025-v1/du-lieu-nap.json'));
        foreach (['{}', substr($bytes, 0, -1), str_replace('"draft"', '"published"', $bytes), str_repeat('x', 8_000_001)] as $input) {
            try {
                $service->decodeVerified($input);
                $this->fail('Unreviewed bytes accepted');
            } catch (\RuntimeException $error) {
                $this->assertSame('knowledge_bundle_mismatch', $error->getMessage());
            }
        }
        $this->assertDatabaseCount('van_ban', 0);
    }

    public function test_import_round_trip_reimport_and_account_isolation(): void
    {
        DB::table('nguoi_dung')->insert([
            'ho_ten' => 'Fixture', 'thu_dien_tu' => 'fixture@example.test', 'mat_khau' => 'synthetic-no-login',
        ]);
        $before = (array) DB::table('nguoi_dung')->first();
        $service = app(KnowledgeImport::class);
        $this->assertSame('imported', $service->run(true, (string) Str::uuid()));
        foreach (['van_ban' => 1, 'dieu_khoan' => 434, 'tu_khoa' => 60, 'dieu_khoan_tu_khoa' => 1326, 'quy_dinh' => 434, 'nhat_ky_quan_tri' => 1] as $table => $n) {
            $this->assertDatabaseCount($table, $n);
        }
        $this->assertSame('unchanged', $service->run(true, (string) Str::uuid()));
        $this->assertDatabaseCount('nhat_ky_quan_tri', 1);
        $this->assertSame($before, (array) DB::table('nguoi_dung')->first());
        $this->assertDatabaseHas('van_ban', ['trang_thai' => 'draft', 'so_hieu' => '116/2025/QH15']);
        $this->assertStringContainsString('Bộ trưởng Bộ Quốc phòng', DB::table('dieu_khoan')->where('so_dieu', '20')->where('so_khoan', '4')->where('ky_hieu_diem', 'b')->value('noi_dung'));
        $audit = json_decode(DB::table('nhat_ky_quan_tri')->value('du_lieu_them'), true);
        $this->assertSame(KnowledgeImport::BUNDLE_SHA256, $audit['bundle_sha256']);
    }

    public function test_conflicting_existing_text_is_not_overwritten(): void
    {
        $service = app(KnowledgeImport::class);
        $service->run(true, (string) Str::uuid());
        DB::table('dieu_khoan')->where('thu_tu', 1)->update(['noi_dung' => 'Previously edited content']);
        $this->artisan('cyberlaw:import-knowledge', ['--apply' => true])->assertExitCode(1);
        $this->assertDatabaseHas('dieu_khoan', ['thu_tu' => 1, 'noi_dung' => 'Previously edited content']);
        $this->assertDatabaseCount('nhat_ky_quan_tri', 1);
        $this->assertDatabaseCount('dieu_khoan', 434);
    }

    public function test_missing_link_and_extra_rule_are_rejected(): void
    {
        $service = app(KnowledgeImport::class);
        $service->run(true, (string) Str::uuid());
        $link = (array) DB::table('dieu_khoan_tu_khoa')->first();
        DB::table('dieu_khoan_tu_khoa')->where($link)->delete();
        $this->artisan('cyberlaw:import-knowledge', ['--apply' => true])->assertExitCode(1);
        $this->assertDatabaseCount('dieu_khoan_tu_khoa', 1325);
        DB::table('dieu_khoan_tu_khoa')->insert($link);
        $rule = (array) DB::table('quy_dinh')->first();
        unset($rule['ma_quy_dinh']);
        DB::table('quy_dinh')->insert($rule);
        $this->artisan('cyberlaw:import-knowledge', ['--apply' => true])->assertExitCode(1);
        $this->assertDatabaseCount('quy_dinh', 435);
    }

    public function test_existing_keyword_is_never_silently_merged(): void
    {
        DB::table('tu_khoa')->insert(['cum_tu' => 'An ninh mạng', 'dinh_nghia' => 'Another curated source', 'ngay_tao' => now(), 'ngay_cap_nhat' => now()]);
        $this->artisan('cyberlaw:import-knowledge', ['--apply' => true])->assertExitCode(1);
        $this->assertDatabaseCount('van_ban', 0);
        $this->assertDatabaseCount('tu_khoa', 1);
    }

    public function test_audit_failure_rolls_back_every_knowledge_table(): void
    {
        DB::statement("CREATE TRIGGER reject_audit BEFORE INSERT ON nhat_ky_quan_tri BEGIN SELECT RAISE(ABORT, 'synthetic audit failure'); END");
        $this->artisan('cyberlaw:import-knowledge', ['--apply' => true])->assertExitCode(1);
        foreach (['van_ban', 'dieu_khoan', 'tu_khoa', 'dieu_khoan_tu_khoa', 'quy_dinh', 'nhat_ky_quan_tri'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_partial_import_failure_rolls_back_and_never_logs_database_text(): void
    {
        DB::statement("CREATE TRIGGER reject_late_provision BEFORE INSERT ON dieu_khoan WHEN NEW.thu_tu = 200 BEGIN SELECT RAISE(ABORT, 'PRIVATE-CANARY-IMPORT'); END");
        $this->artisan('cyberlaw:import-knowledge', ['--apply' => true])
            ->doesntExpectOutputToContain('PRIVATE-CANARY-IMPORT')->assertExitCode(1);
        $this->assertDatabaseCount('van_ban', 0);
        $this->assertDatabaseCount('dieu_khoan', 0);
        $this->assertDatabaseCount('nhat_ky_quan_tri', 0);
    }
}
