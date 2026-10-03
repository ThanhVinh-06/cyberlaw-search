<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use App\Support\PasswordSession;
use App\Support\PermissionMatrix;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\Support\AccountSchema;
use Tests\TestCase;

final class AdminUserTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        AccountSchema::create();
        Schema::create('hoi_thoai', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('ma_nguoi_dung');
        });
        $this->app->bind(ValidateCsrfToken::class, AdminRealCsrf::class);
        foreach (['application', 'audit', 'security'] as $channel) {
            config(['logging.channels.'.$channel => config('logging.channels.null')]);
        }
    }

    private function account(string $role = 'admin', bool $verified = true): NguoiDung
    {
        $u = new NguoiDung(['ho_ten' => 'Tài khoản thử', 'thu_dien_tu' => 'fixture'.(NguoiDung::count() + 1).'@example.test', 'mat_khau' => ' OldPassword!123 ']);
        $u->vai_tro = $role;
        $u->trang_thai = 'active';
        $u->duoc_mien_xac_minh_email = $verified;
        $u->save();

        return $u;
    }

    private function login(NguoiDung $u): void
    {
        $this->actingAs($u)->withSession(['_token' => 'admin-test-csrf', 'auth_password_fingerprint' => PasswordSession::fingerprint($u)]);
    }

    private function revision(NguoiDung $u): string
    {
        return $this->getJson('/api/admin/users?q='.urlencode($u->thu_dien_tu))->assertOk()->json('users.0.revision');
    }

    private function save(array $data, ?NguoiDung $u = null)
    {
        $base = $u ? ['revision' => $this->revision($u), 'ho_ten' => $u->ho_ten, 'thu_dien_tu' => $u->thu_dien_tu, 'vai_tro' => $u->vai_tro, 'trang_thai' => $u->trang_thai] : ['ho_ten' => 'Mới tạo', 'thu_dien_tu' => 'new@example.test', 'mat_khau' => ' Password!123 ', 'vai_tro' => 'user', 'trang_thai' => 'active'];

        return $this->postJson('/api/admin/users'.($u ? '/'.$u->getKey() : ''), [...$base, ...$data], ['X-CSRF-TOKEN' => 'admin-test-csrf']);
    }

    public function test_server_authorization_and_csrf_apply_to_every_route(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
        $user = $this->account('user');
        $this->login($user);
        $this->getJson('/api/admin/users')->assertForbidden();
        $this->save([])->assertForbidden();
        $this->postJson('/api/admin/users/1/status', ['revision' => str_repeat('a', 64), 'trang_thai' => 'blocked'], ['X-CSRF-TOKEN' => 'admin-test-csrf'])->assertForbidden();
        $this->deleteJson('/api/admin/users/1', [], ['X-CSRF-TOKEN' => 'admin-test-csrf'])->assertForbidden();
        $admin = $this->account();
        $this->login($admin);
        $this->postJson('/api/admin/users', [])->assertStatus(419);
        $this->postJson('/api/admin/users', [], ['Origin' => 'https://evil.test'])->assertForbidden();
        $this->assertDatabaseCount('nguoi_dung', 2);
        $this->assertDatabaseCount('nhat_ky_quan_tri', 0);
    }

    public function test_create_preserves_password_bytes_requires_email_verification_and_excludes_secrets(): void
    {
        $this->login($this->account());
        $this->save(['duoc_mien_xac_minh_email' => true, 'ngay_xac_minh_email' => '2020-01-01', 'ma_ghi_nho' => 'forged', 'ma_nguoi_dung' => 999])->assertCreated();
        $u = NguoiDung::where('thu_dien_tu', 'new@example.test')->firstOrFail();
        $this->assertTrue(Hash::check(' Password!123 ', $u->mat_khau));
        $this->assertFalse(Hash::check('Password!123', $u->mat_khau));
        $this->assertFalse($u->canUseAccount());
        $this->assertNull($u->ma_ghi_nho);
        $this->getJson('/api/admin/users')->assertOk()->assertJsonMissingPath('users.0.mat_khau')->assertJsonMissingPath('users.0.ma_ghi_nho');
        $this->save(['thu_dien_tu' => 'NEW@EXAMPLE.TEST'])->assertUnprocessable();
        $this->save(['mat_khau' => str_repeat('đ', 37)])->assertUnprocessable();
        $this->save(['vai_tro' => 'superadmin'])->assertUnprocessable();
        $this->assertDatabaseCount('nguoi_dung', 2);
    }

    public function test_self_access_changes_and_last_usable_admin_are_protected(): void
    {
        $admin = $this->account();
        $this->account('admin', false);
        $this->login($admin);
        foreach ([['vai_tro' => 'user'], ['trang_thai' => 'blocked'], ['thu_dien_tu' => 'other@example.test'], ['mat_khau' => 'Changed!123']] as $data) {
            $this->save($data, $admin)->assertUnprocessable();
        }
        $this->deleteJson('/api/admin/users/'.$admin->getKey(), ['revision' => $this->revision($admin)], ['X-CSRF-TOKEN' => 'admin-test-csrf'])->assertUnprocessable();
        $this->save(['ho_ten' => 'Tên mới'], $admin)->assertOk();
        $this->assertSame('admin', $admin->fresh()->vai_tro);
        $this->assertSame('active', $admin->fresh()->trang_thai);
        $this->assertDatabaseCount('nguoi_dung', 2);
    }

    public function test_block_unlock_role_password_and_email_changes_revoke_old_sessions_and_grants(): void
    {
        $admin = $this->account();
        $other = $this->account('user');
        $this->login($admin);
        $oldFingerprint = PasswordSession::fingerprint($other);
        DB::table('yeu_cau_xac_minh_email')->insert(['ma_nguoi_dung' => $other->getKey(), 'ma_xac_nhan_bam' => 'test-hash', 'ngay_tao' => now(), 'ngay_het_han' => now()->addMinutes(5)]);
        $this->save(['trang_thai' => 'blocked'], $other)->assertOk();
        $other->refresh();
        $this->save(['trang_thai' => 'active'], $other)->assertOk();
        $this->assertNotSame($oldFingerprint, PasswordSession::fingerprint($other->fresh()));
        $this->assertNotNull(DB::table('yeu_cau_xac_minh_email')->value('ngay_huy'));
        $this->actingAs($other->fresh())->withSession(['auth_password_fingerprint' => $oldFingerprint]);
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->login($admin);
        $this->save(['vai_tro' => 'admin'], $other->fresh())->assertOk();
        $this->save(['mat_khau' => ' Updated!123 '], $other->fresh())->assertOk();
        $this->assertTrue(Hash::check(' Updated!123 ', $other->fresh()->mat_khau));
        $this->save(['thu_dien_tu' => 'changed@example.test'], $other->fresh())->assertOk();
        $this->assertFalse($other->fresh()->canUseAccount());
    }

    public function test_revision_conflict_audit_failure_and_delete_history_protection(): void
    {
        $admin = $this->account();
        $user = $this->account('user');
        $this->login($admin);
        $revision = $this->revision($user);
        $this->save(['ho_ten' => 'Một thay đổi'], $user)->assertOk();
        $this->save(['revision' => $revision, 'ho_ten' => 'Ghi đè'], $user->fresh())->assertConflict();
        DB::table('hoi_thoai')->insert(['ma_nguoi_dung' => $user->getKey()]);
        $this->deleteJson('/api/admin/users/'.$user->getKey(), ['revision' => $this->revision($user->fresh())], ['X-CSRF-TOKEN' => 'admin-test-csrf'])->assertUnprocessable();
        $empty = $this->account('user');
        $this->deleteJson('/api/admin/users/'.$empty->getKey(), ['revision' => $this->revision($empty)], ['X-CSRF-TOKEN' => 'admin-test-csrf'])->assertOk();
        $before = $user->fresh()->getRawOriginal();
        DB::unprepared("CREATE TRIGGER reject_user_audit BEFORE INSERT ON nhat_ky_quan_tri BEGIN SELECT RAISE(ABORT, 'private-canary-user'); END");
        $r = $this->save(['ho_ten' => 'Rollback'], $user->fresh())->assertStatus(500);
        $this->assertStringNotContainsString('private-canary-user', $r->getContent());
        $this->assertSame($before, $user->fresh()->getRawOriginal());
    }

    public function test_filter_pagination_stats_and_rate_limits(): void
    {
        $this->login($this->account());
        for ($i = 0; $i < 12; $i++) {
            $this->account('user');
        }
        $this->getJson('/api/admin/users?page=2')->assertOk()->assertJsonCount(3, 'users')->assertJsonPath('stats.total', 13);
        $firstPage = $this->getJson('/api/admin/users?page=1')->assertOk()->json('users');
        $secondPage = $this->getJson('/api/admin/users?page=2')->assertOk()->json('users');
        $this->assertSame(range(1, 13), array_column([...$firstPage, ...$secondPage], 'ma_nguoi_dung'));
        $this->getJson('/api/admin/users?role=admin')->assertOk()->assertJsonCount(1, 'users');
        $this->getJson('/api/admin/users?q=%25')->assertOk()->assertJsonCount(0, 'users');
        $this->getJson('/api/admin/users?role=invalid')->assertUnprocessable();
        for ($i = 0; $i < 30; $i++) {
            $this->save(['vai_tro' => 'invalid'])->assertUnprocessable();
        }
        $this->save([])->assertStatus(429);
        $this->getJson('/api/admin/users')->assertOk();
    }

    public function test_permission_matrix_is_server_owned_and_admin_only(): void
    {
        $this->getJson('/api/admin/permission-matrix')->assertUnauthorized();
        $user = $this->account('user');
        $this->login($user);
        $this->getJson('/api/admin/permission-matrix')->assertForbidden();
        $admin = $this->account();
        $this->login($admin);
        $response = $this->getJson('/api/admin/permission-matrix')->assertOk();
        $response->assertJsonPath('roles', ['khach', 'user', 'admin']);
        $response->assertJsonPath('version', PermissionMatrix::VERSION);
        $response->assertJsonPath('rules.0.ma_chuc_nang', 'tra_cuu_luat');
        $response->assertJsonPath('rules.5.admin', true);
        // Guests may chat (their threads are stored with a guest label) but never list history.
        $response->assertJsonPath('rules.2.ma_chuc_nang', 'chat_ai_cyberlaw');
        $response->assertJsonPath('rules.2.khach', true);
        $response->assertJsonPath('rules.3.ma_chuc_nang', 'xem_lich_su_chat');
        $response->assertJsonPath('rules.3.khach', false);
        $this->assertCount(8, $response->json('rules'));
    }
}

final class AdminRealCsrf extends ValidateCsrfToken
{
    protected function runningUnitTests()
    {
        return false;
    }
}
