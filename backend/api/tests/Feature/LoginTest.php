<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\Support\AccountSchema;
use Tests\TestCase;

class LoginTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        AccountSchema::create();
        config(['logging.channels.application' => config('logging.channels.null'), 'logging.channels.security' => config('logging.channels.null')]);
        // Laravel normally bypasses CSRF under PHPUnit. Enable the actual check for these tests.
        $this->app->bind(ValidateCsrfToken::class, RealCsrf::class);
        Route::middleware(['web', 'account.active', 'role.admin'])->get('/api/test/admin', fn () => ['ok' => true])->name('test.admin');
    }

    private function account(string $role = 'user', string $status = 'active', string $password = ' Valid password 123! '): NguoiDung
    {
        $user = new NguoiDung(['ho_ten' => 'Test Account', 'thu_dien_tu' => 'member@example.test', 'mat_khau' => $password]);
        $user->vai_tro = $role;
        $user->trang_thai = $status;
        $user->setAttribute('duoc_mien_xac_minh_email', true); // Existing account before verification rollout.
        $user->save();

        return $user;
    }

    private function login(array $extra = [])
    {
        return $this->withSession(['_token' => 'test-csrf'])->postJson('/api/auth/login', array_merge([
            'email' => 'member@example.test', 'password' => ' Valid password 123! ',
        ], $extra), ['X-CSRF-TOKEN' => 'test-csrf']);
    }

    public function test_login_normalizes_email_preserves_password_and_excludes_secrets(): void
    {
        $user = $this->account();
        $this->getJson('/api/auth/csrf')->assertOk()->assertJsonStructure(['csrf_token']);
        $oldId = session()->getId();
        $response = $this->login(['email' => ' MEMBER@example.test ', 'vai_tro' => 'admin', 'ma_nguoi_dung' => 999]);
        $response->assertOk()->assertJsonPath('user.vai_tro', 'user')->assertJsonPath('user.ma_nguoi_dung', $user->getKey());
        $response->assertJsonMissingPath('user.mat_khau')->assertJsonMissingPath('user.ma_ghi_nho');
        $this->assertNotEquals($oldId, session()->getId());
        $this->assertNotNull($user->fresh()->lan_dang_nhap_cuoi);
        $this->assertSame('user', $user->fresh()->vai_tro);
        Auth::forgetGuards();
        $this->getJson('/api/auth/me')->assertOk()->assertHeader('X-Request-ID')->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_invalid_credentials_and_blocked_accounts_have_the_same_response(): void
    {
        $missing = $this->login()->assertUnauthorized()->json();
        $user = $this->account();
        $wrong = $this->login(['password' => 'wrong'])->assertUnauthorized()->json();
        $trimmed = $this->login(['password' => 'Valid password 123!'])->assertUnauthorized()->json();
        $user->trang_thai = 'blocked';
        $user->save();
        $blocked = $this->login()->assertUnauthorized()->json();
        $this->assertSame($missing, $wrong);
        $this->assertSame($missing, $blocked);
        $this->assertSame($missing, $trimmed);
        $this->assertNull($user->fresh()->lan_dang_nhap_cuoi);
        $this->assertGuest();
    }

    public function test_login_and_logout_require_csrf_and_reject_foreign_origins(): void
    {
        $user = $this->account();
        $this->postJson('/api/auth/login', ['email' => $user->thu_dien_tu, 'password' => ' Valid password 123! '])->assertStatus(419);
        $this->withSession(['_token' => 'correct'])->postJson('/api/auth/login', [], ['X-CSRF-TOKEN' => 'wrong'])->assertStatus(419);
        $this->withHeaders(['Origin' => 'https://untrusted.example'])->login()->assertForbidden();
        $this->assertNull($user->fresh()->lan_dang_nhap_cuoi);
        $this->flushHeaders();
        $this->login()->assertOk();
        $this->postJson('/api/auth/logout')->assertStatus(419);
        $this->assertAuthenticated();
    }

    public function test_logout_invalidates_session_and_current_user_requires_auth(): void
    {
        $this->account();
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->login()->assertOk();
        $oldId = session()->getId();
        $this->postJson('/api/auth/logout', [], ['X-CSRF-TOKEN' => session()->token()])->assertOk();
        $this->assertNotSame($oldId, session()->getId());
        Auth::forgetGuards();
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_blocking_account_revokes_existing_access(): void
    {
        $user = $this->account();
        $this->login()->assertOk();
        $user->trang_thai = 'blocked';
        $user->save();
        Auth::forgetGuards();
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->assertGuest();
    }

    public function test_admin_permission_is_checked_by_server_on_each_request(): void
    {
        $this->getJson('/api/test/admin')->assertUnauthorized();
        $user = $this->account('admin');
        $this->login()->assertOk();
        $this->getJson('/api/test/admin')->assertOk();
        $user->vai_tro = 'user';
        $user->save();
        Auth::forgetGuards();
        $this->getJson('/api/test/admin')->assertForbidden();
        $this->assertSame('user', $user->fresh()->vai_tro);
    }

    public function test_rate_limit_cannot_be_bypassed_by_changing_case_or_client_ip_header(): void
    {
        $user = $this->account();
        for ($i = 0; $i < 5; $i++) {
            $this->withHeaders(['X-Forwarded-For' => '192.0.2.'.($i + 1)])
                ->login(['password' => 'wrong', 'email' => $i % 2 ? 'MEMBER@example.test' : 'member@example.test'])->assertUnauthorized();
        }
        $this->login()->assertStatus(429)->assertHeader('Retry-After');
        $this->assertNull($user->fresh()->lan_dang_nhap_cuoi);
    }

    public function test_bad_shapes_injection_and_large_payload_do_not_authenticate(): void
    {
        $user = $this->account();
        $this->login(['email' => ['not-string']])->assertUnprocessable();
        $this->login(['password' => ['not-string']])->assertUnprocessable();
        $this->login(['email' => "' OR 1=1 --"])->assertUnprocessable();
        $this->login(['password' => str_repeat('a', 129)])->assertUnprocessable();
        $this->login(['extra' => str_repeat('x', 9000)])->assertStatus(413);
        $this->assertGuest();
        $this->assertNull($user->fresh()->lan_dang_nhap_cuoi);
    }

    public function test_database_failure_returns_no_trace_or_sensitive_query(): void
    {
        config(['app.debug' => true]);
        Schema::drop('nguoi_dung');
        $response = $this->login()->assertStatus(500);
        $this->assertSame(['message'], array_keys($response->json()));
        $response->assertHeader('X-Request-ID');
        $this->assertGuest();
    }

    public function test_cli_creates_hashed_account_and_transactional_audit(): void
    {
        $this->artisan('cyberlaw:create-account --admin')
            ->expectsQuestion('Ho va ten', 'Test Admin')->expectsQuestion('Email', 'admin@example.test')
            ->expectsQuestion('Mat khau (12-72 byte; khong hien tren man hinh)', ' test-secret-12345 ')
            ->expectsQuestion('Nhap lai mat khau', ' test-secret-12345 ')->assertSuccessful();
        $user = NguoiDung::firstOrFail();
        $this->assertTrue($user->isAdmin());
        $this->assertTrue(Hash::check(' test-secret-12345 ', $user->mat_khau));
        $this->assertSame(1, DB::table('nhat_ky_quan_tri')->count());
        $this->assertStringNotContainsString('test-secret', (string) DB::table('nhat_ky_quan_tri')->value('du_lieu_them'));
    }

    public function test_password_beyond_bcrypt_limit_is_not_an_alias(): void
    {
        $user = $this->account(password: str_repeat('a', 72));
        $this->login(['password' => str_repeat('a', 72).'extra'])->assertUnprocessable();
        $this->assertNull($user->fresh()->lan_dang_nhap_cuoi);
        $this->login(['password' => str_repeat('a', 72)])->assertOk();
    }

    public function test_ip_limit_also_applies_when_email_changes(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $this->login(['email' => 'invalid-email-'.$i])->assertUnprocessable();
        }
        $this->login(['email' => 'yet-another-email'])->assertStatus(429);
        $this->assertSame(0, NguoiDung::count());
    }

    public function test_cli_rolls_back_when_audit_cannot_be_written(): void
    {
        Schema::drop('nhat_ky_quan_tri');
        $this->artisan('cyberlaw:create-account --admin')
            ->expectsQuestion('Ho va ten', 'Test Admin')->expectsQuestion('Email', 'admin@example.test')
            ->expectsQuestion('Mat khau (12-72 byte; khong hien tren man hinh)', ' test-secret-12345 ')
            ->expectsQuestion('Nhap lai mat khau', ' test-secret-12345 ')->assertFailed();
        $this->assertSame(0, NguoiDung::count());
    }

    public function test_cli_does_not_overwrite_existing_account(): void
    {
        $user = $this->account();
        $originalHash = $user->mat_khau;
        $this->artisan('cyberlaw:create-account --admin')
            ->expectsQuestion('Ho va ten', 'Test Admin')->expectsQuestion('Email', 'member@example.test')
            ->expectsQuestion('Mat khau (12-72 byte; khong hien tren man hinh)', ' test-secret-12345 ')
            ->expectsQuestion('Nhap lai mat khau', ' test-secret-12345 ')->assertFailed();
        $this->assertSame(1, NguoiDung::count());
        $this->assertSame('user', $user->fresh()->vai_tro);
        $this->assertSame($originalHash, $user->fresh()->mat_khau);
    }
}

class RealCsrf extends ValidateCsrfToken
{
    protected function runningUnitTests()
    {
        return false;
    }
}
