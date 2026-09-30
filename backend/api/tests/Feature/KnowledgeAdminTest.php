<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use App\Models\VanBan;
use App\Services\KnowledgeAdmin;
use App\Support\PasswordSession;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\KnowledgeSchema;
use Tests\TestCase;

final class KnowledgeAdminTest extends TestCase
{
    private string $url = '/api/admin/knowledge';

    protected function setUp(): void
    {
        parent::setUp();
        KnowledgeSchema::create();
        Schema::create('trich_dan', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('ma_dieu_khoan');
        });
        $this->app->bind(ValidateCsrfToken::class, KnowledgeRealCsrf::class);
        foreach (['application', 'security', 'audit'] as $channel) {
            config(['logging.channels.'.$channel => config('logging.channels.null')]);
        }
    }

    private function login(string $role = 'admin'): NguoiDung
    {
        $user = new NguoiDung(['ho_ten' => 'Fixture', 'thu_dien_tu' => 'knowledge@example.test', 'mat_khau' => 'Fixture-password123!']);
        $user->vai_tro = $role;
        $user->trang_thai = 'active';
        $user->duoc_mien_xac_minh_email = true;
        $user->save();
        $this->actingAs($user)->withSession(['_token' => 'knowledge-csrf', 'auth_password_fingerprint' => PasswordSession::fingerprint($user)]);

        return $user;
    }

    private function revision(): string
    {
        return app(KnowledgeAdmin::class)->snapshot()['revision'];
    }

    private function save(string $table, array $data, ?int $id = null)
    {
        return $this->postJson($this->url.'/'.$table.($id ? '/'.$id : ''), ['revision' => $this->revision(), ...$data], ['X-CSRF-TOKEN' => 'knowledge-csrf']);
    }

    private function document(): void
    {
        $this->save('van_ban', ['so_hieu' => 'TEST-2025', 'tieu_de' => 'Văn bản thử', 'ngay_ban_hanh' => '2025-12-10', 'ngay_hieu_luc' => '2026-07-01', 'lien_ket_nguon' => 'https://example.test/law'])->assertCreated();
    }

    private function clause(string $point = ''): array
    {
        return ['ma_van_ban' => 1, 'so_dieu' => '2', 'so_khoan' => '1', 'ky_hieu_diem' => $point, 'noi_dung' => 'Nội dung gốc. Không được làm sai căn cứ.', 'thu_tu' => 1, 'trang_nguon' => 2];
    }

    public function test_guest_user_and_revoked_accounts_cannot_access_any_knowledge_route(): void
    {
        $this->getJson($this->url)->assertUnauthorized();
        $user = $this->login('user');
        $this->getJson($this->url)->assertForbidden();
        $this->save('van_ban', [])->assertForbidden();
        $user->vai_tro = 'admin';
        $user->save();
        $this->getJson($this->url)->assertOk();
        $user->trang_thai = 'blocked';
        $user->save();
        $this->getJson($this->url)->assertUnauthorized();
        $this->assertDatabaseCount('van_ban', 0);
    }

    public function test_csrf_origin_and_input_validation_prevent_writes(): void
    {
        $this->login();
        $this->postJson($this->url.'/van_ban', [])->assertStatus(419);
        $this->postJson($this->url.'/van_ban', [], ['Origin' => 'https://evil.test'])->assertForbidden();
        $this->save('van_ban', ['so_hieu' => [], 'tieu_de' => str_repeat('a', 501)])->assertUnprocessable()->assertJsonStructure(['errors' => ['so_hieu', 'tieu_de']]);
        $this->save('van_ban', ['so_hieu' => 'TEST', 'tieu_de' => 'Test', 'lien_ket_nguon' => 'javascript:alert(1)'])->assertUnprocessable();
        $this->assertDatabaseCount('van_ban', 0);
    }

    public function test_crud_relations_versions_d_and_dd_and_deletion_protection(): void
    {
        $this->login();
        $this->document();
        $this->save('dieu_khoan', $this->clause('d'))->assertCreated();
        $this->save('dieu_khoan', $this->clause('đ'))->assertCreated();
        $this->save('dieu_khoan', $this->clause('d'))->assertUnprocessable();
        $this->save('tu_khoa', ['cum_tu' => 'Thử', 'bien_the' => ['thu'], 'dinh_nghia' => 'Định nghĩa', 'ma_dieu_khoan_dinh_nghia' => 1, 'lien_ket' => [1, 2]])->assertCreated();
        $this->assertDatabaseCount('dieu_khoan_tu_khoa', 2);
        $rule = ['ma_dieu_khoan' => 1, 'loai_quy_dinh' => 'prohibition', 'hanh_vi' => 'Hành vi', 'trich_nguyen_van' => 'Không được làm sai căn cứ.'];
        $this->save('quy_dinh', $rule)->assertCreated();
        $this->save('quy_dinh', [...$rule, 'trich_nguyen_van' => 'Sai nguồn'])->assertUnprocessable();
        $this->save('dieu_khoan', [...$this->clause('d'), 'noi_dung' => 'Bị sửa'], 1)->assertUnprocessable();
        $this->deleteJson($this->url.'/dieu_khoan/1', ['revision' => $this->revision()], ['X-CSRF-TOKEN' => 'knowledge-csrf'])->assertConflict();
        $this->deleteJson($this->url.'/van_ban/1', ['revision' => $this->revision()], ['X-CSRF-TOKEN' => 'knowledge-csrf'])->assertConflict();
        $this->save('tu_khoa', ['cum_tu' => 'Thử lại', 'bien_the' => [], 'dinh_nghia' => '', 'ma_dieu_khoan_dinh_nghia' => null, 'lien_ket' => []], 1)->assertOk();
        $this->deleteJson($this->url.'/quy_dinh/1', ['revision' => $this->revision()], ['X-CSRF-TOKEN' => 'knowledge-csrf'])->assertOk();
        DB::table('trich_dan')->insert(['ma_dieu_khoan' => 1]);
        $this->deleteJson($this->url.'/dieu_khoan/1', ['revision' => $this->revision()], ['X-CSRF-TOKEN' => 'knowledge-csrf'])->assertConflict();
        $this->deleteJson($this->url.'/dieu_khoan/2', ['revision' => $this->revision()], ['X-CSRF-TOKEN' => 'knowledge-csrf'])->assertOk();
        $this->assertGreaterThan(1, VanBan::find(1)->phien_ban_noi_dung);
        $this->assertDatabaseCount('nhat_ky_quan_tri', 8);
    }

    public function test_publish_requires_review_and_edit_returns_document_to_draft(): void
    {
        $this->login();
        $this->document();
        $status = fn ($review) => $this->postJson($this->url.'/van_ban/1/status', ['revision' => $this->revision(), 'trang_thai' => 'published', 'da_doi_chieu' => $review], ['X-CSRF-TOKEN' => 'knowledge-csrf']);
        $status(true)->assertUnprocessable();
        $this->save('dieu_khoan', $this->clause())->assertCreated();
        $status(false)->assertUnprocessable();
        $status(true)->assertOk()->assertJsonPath('van_ban.0.trang_thai', 'published');
        $this->save('dieu_khoan', [...$this->clause(), 'tieu_de' => 'Đã sửa'], 1)->assertOk()->assertJsonPath('van_ban.0.trang_thai', 'draft');
        $this->save('van_ban', ['so_hieu' => 'FORGED', 'tieu_de' => 'Test', 'trang_thai' => 'published', 'phien_ban_noi_dung' => 999, 'duong_dan_tep' => '../../.env'])->assertCreated()->assertJsonPath('van_ban.1.trang_thai', 'draft')->assertJsonPath('van_ban.1.phien_ban_noi_dung', 1)->assertJsonPath('van_ban.1.duong_dan_tep', '');
    }

    public function test_stale_revision_audit_failure_and_missing_ids_do_not_modify_data(): void
    {
        $this->login();
        $stale = $this->revision();
        $this->document();
        $this->save('van_ban', ['revision' => $stale, 'so_hieu' => 'STALE', 'tieu_de' => 'stale'])->assertConflict();
        $this->save('van_ban', ['so_hieu' => 'MISSING', 'tieu_de' => 'missing'], 999)->assertNotFound();
        $before = $this->revision();
        DB::unprepared("CREATE TRIGGER reject_knowledge_audit BEFORE INSERT ON nhat_ky_quan_tri BEGIN SELECT RAISE(ABORT, 'CANARY-private-audit'); END");
        $response = $this->save('van_ban', ['so_hieu' => 'ROLLBACK', 'tieu_de' => 'rollback'])->assertStatus(500);
        $this->assertStringNotContainsString('CANARY', $response->getContent());
        $this->assertSame($before, $this->revision());
    }

    public function test_upload_is_private_download_is_attachment_and_rollback_removes_new_file(): void
    {
        $this->login();
        Storage::fake('local');
        $base = ['so_hieu' => 'UPLOAD', 'tieu_de' => 'PDF'];
        $this->save('van_ban', [...$base, 'tep' => UploadedFile::fake()->createWithContent('fake.pdf', '<?php echo 1;')])->assertUnprocessable();
        $this->post($this->url.'/van_ban', [...$base, 'revision' => $this->revision(), 'tep' => UploadedFile::fake()->createWithContent('source.pdf', "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF")], ['X-CSRF-TOKEN' => 'knowledge-csrf', 'Accept' => 'application/json'])->assertCreated();
        $path = VanBan::find(1)->duong_dan_tep;
        Storage::disk('local')->assertExists($path);
        $this->get($this->url.'/van_ban/1/pdf')->assertOk()->assertHeader('Content-Disposition', 'attachment; filename=van-ban-1.pdf');
        VanBan::find(1)->update(['duong_dan_tep' => '../../.env']);
        $this->get($this->url.'/van_ban/1/pdf')->assertNotFound();
        $files = Storage::disk('local')->allFiles();
        DB::unprepared("CREATE TRIGGER reject_upload_audit BEFORE INSERT ON nhat_ky_quan_tri BEGIN SELECT RAISE(ABORT, 'failure'); END");
        $this->post($this->url.'/van_ban', ['so_hieu' => 'FAIL', 'tieu_de' => 'PDF', 'revision' => $this->revision(), 'tep' => UploadedFile::fake()->createWithContent('source.pdf', "%PDF-1.4\n%%EOF")], ['X-CSRF-TOKEN' => 'knowledge-csrf', 'Accept' => 'application/json'])->assertStatus(500);
        $this->assertSame($files, Storage::disk('local')->allFiles());
    }

    public function test_search_filters_pagination_and_snapshot_return_complete_data(): void
    {
        $this->login();
        $this->document();
        for ($i = 1; $i <= 8; $i++) {
            $this->save('dieu_khoan', [...$this->clause(), 'so_dieu' => (string) $i])->assertCreated();
        }
        $this->getJson($this->url)->assertOk()->assertJsonCount(8, 'dieu_khoan');
        $this->getJson($this->url.'/list/dieu_khoan?page=2')->assertOk()->assertJsonCount(2, 'items')->assertJsonPath('total', 8);
        $this->getJson($this->url.'/list/dieu_khoan?q=dieu%207')->assertOk()->assertJsonCount(1, 'items');
        $this->getJson($this->url.'/list/van_ban?type=published')->assertOk()->assertJsonPath('total', 0);
        $this->getJson($this->url.'/list/dieu_khoan?document=999')->assertOk()->assertJsonPath('total', 0);
        $this->getJson($this->url.'/list/dieu_khoan?page=-1')->assertUnprocessable();
        $this->getJson($this->url.'/list/nguoi_dung')->assertNotFound();
    }

    public function test_read_requests_do_not_consume_write_quota_and_writes_are_limited(): void
    {
        $this->login();
        for ($i = 0; $i < 35; $i++) $this->getJson($this->url)->assertOk();
        $this->document();
        for ($i = 0; $i < 29; $i++) $this->save('van_ban', [])->assertUnprocessable();
        $this->save('van_ban', [])->assertStatus(429);
        $this->getJson($this->url)->assertOk();
        $this->assertDatabaseCount('van_ban', 1);
    }
}

final class KnowledgeRealCsrf extends ValidateCsrfToken
{
    protected function runningUnitTests()
    {
        return false;
    }
}
