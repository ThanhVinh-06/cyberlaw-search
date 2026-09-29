<?php

namespace Tests\Feature;

use App\Mail\EmailVerificationCode;
use App\Mail\PasswordResetCode;
use App\Models\NguoiDung;
use App\Models\YeuCauXacMinhEmail;
use App\Support\PasswordSession;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Monolog\Handler\NullHandler;
use Tests\Support\AccountSchema;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->startOfSecond());
        AccountSchema::create();
        $this->app->bind(ValidateCsrfToken::class, EmailCsrf::class);
        config(['mail.default' => 'smtp']);
        foreach (['application', 'security'] as $channel) {
            config(["logging.channels.$channel" => ['driver' => 'monolog', 'handler' => NullHandler::class]]);
        }
        Mail::fake();
    }

    private function postAuth(string $path, array $data = [])
    {
        return $this->withSession(['_token' => 'verification-test-csrf'])->postJson('/api/auth/'.$path, $data, ['X-CSRF-TOKEN' => 'verification-test-csrf']);
    }

    private function register(string $email = 'verify@example.test'): string
    {
        $this->postAuth('register', ['name' => 'Verify Test', 'email' => $email, 'password' => ' Verify-password!123 ', 'password_confirmation' => ' Verify-password!123 ', 'duoc_mien_xac_minh_email' => true, 'ngay_xac_minh_email' => '2020-01-01'])->assertCreated()->assertJsonPath('verification_required', true)->assertJsonPath('mail_sent', true);

        return Mail::sent(EmailVerificationCode::class)->last()->code;
    }

    public function test_registration_email_verification_login_and_replay(): void
    {
        $code = $this->register();
        $user = NguoiDung::sole();
        $this->assertFalse($user->canUseAccount());
        $this->assertNull($user->getAttribute('ngay_xac_minh_email'));
        $this->assertFalse($user->getAttribute('duoc_mien_xac_minh_email'));
        $this->assertGuest();
        $status = $this->getJson('/api/auth/email/status')->assertOk()->assertJsonPath('email', 'verify@example.test')->assertJsonMissingPath('code');
        $this->assertSame(300, $status->json('expires_in'));
        $this->assertTrue(Hash::check($code, YeuCauXacMinhEmail::sole()->getAttribute('ma_xac_nhan_bam')));
        $this->assertArrayNotHasKey('ma_xac_nhan_bam', YeuCauXacMinhEmail::sole()->toArray());
        $binding = session()->all();
        $this->postAuth('email/verify', ['code' => $code, 'ma_nguoi_dung' => 999, 'email' => 'other@example.test'])->assertOk();
        $this->assertTrue($user->fresh()->canUseAccount());
        $this->assertGuest();
        $this->assertNull(session('email_verification'));
        $time = $user->fresh()->getAttribute('ngay_xac_minh_email');
        $this->withSession($binding)->postAuth('email/verify', ['code' => $code])->assertUnauthorized();
        $this->assertEquals($time, $user->fresh()->getAttribute('ngay_xac_minh_email'));
        $this->postAuth('login', ['email' => 'verify@example.test', 'password' => ' Verify-password!123 '])->assertOk();
        Auth::forgetGuards();
        $this->getJson('/api/auth/me')->assertOk();
    }

    public function test_correct_password_resumes_unverified_session_without_login_and_wrong_password_does_not(): void
    {
        $this->register();
        session()->invalidate();
        $this->postAuth('login', ['email' => 'verify@example.test', 'password' => 'wrong'])->assertUnauthorized()->assertJsonMissingPath('code');
        $this->getJson('/api/auth/email/status')->assertUnauthorized();
        $this->postAuth('login', ['email' => 'verify@example.test', 'password' => ' Verify-password!123 '])->assertForbidden()->assertJsonPath('code', 'email_unverified');
        $this->assertGuest();
        $this->assertNull(NguoiDung::sole()->getAttribute('lan_dang_nhap_cuoi'));
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->getJson('/api/auth/email/status')->assertOk();
        $this->travel(31)->seconds();
        $this->postAuth('email/send')->assertStatus(202);
        $code = Mail::sent(EmailVerificationCode::class)->last()->code;
        $this->postAuth('email/verify', ['code' => $code])->assertOk();
    }

    public function test_attempts_survive_page_refresh_lock_and_resend_revokes_old_code(): void
    {
        $code = $this->register();
        $wrong = $code === '000000' ? '111111' : '000000';
        for ($i = 1; $i <= 5; $i++) {
            $this->postAuth('email/verify', ['code' => $wrong])->assertUnprocessable();
            $this->assertSame($i, YeuCauXacMinhEmail::sole()->getAttribute('so_lan_thu'));
        }
        $this->getJson('/api/auth/email/status')->assertOk()->assertJsonPath('locked', true);
        $this->postAuth('email/verify', ['code' => $code])->assertUnprocessable()->assertJsonPath('code', 'verification_locked');
        $oldSession = session()->all();
        $this->postAuth('email/send')->assertStatus(429);
        $this->travel(31)->seconds();
        $this->postAuth('email/send')->assertStatus(202);
        $newSession = session()->all();
        $this->withSession($oldSession)->postAuth('email/verify', ['code' => $code])->assertUnprocessable();
        $this->withSession($newSession)->postAuth('email/verify', ['code' => Mail::sent(EmailVerificationCode::class)->last()->code])->assertOk();
    }

    public function test_expiry_session_expiry_and_account_block_prevent_verification(): void
    {
        $code = $this->register();
        $this->travel(300)->seconds();
        $this->postAuth('email/verify', ['code' => $code])->assertUnprocessable()->assertJsonPath('code', 'verification_expired');
        $this->postAuth('email/send')->assertStatus(202);
        $user = NguoiDung::sole();
        $user->setAttribute('trang_thai', 'blocked');
        $user->save();
        $this->postAuth('email/verify', ['code' => Mail::sent(EmailVerificationCode::class)->last()->code])->assertUnauthorized();
        $this->postAuth('email/send')->assertUnauthorized();
        $user->setAttribute('trang_thai', 'active');
        $user->save();
        $this->travel(1801)->seconds();
        $this->getJson('/api/auth/email/status')->assertUnauthorized();
        $this->assertNull($user->fresh()->getAttribute('ngay_xac_minh_email'));
    }

    public function test_cannot_verify_another_account_or_bypass_csrf(): void
    {
        $codeA = $this->register('a@example.test');
        $sessionA = session()->all();
        $codeB = $this->register('b@example.test');
        if ($codeA === $codeB) {
            $this->travel(31)->seconds();
            $this->postAuth('email/send')->assertStatus(202);
            $codeB = Mail::sent(EmailVerificationCode::class)->last()->code;
        }
        $this->withSession($sessionA)->postAuth('email/verify', ['code' => $codeB, 'ma_nguoi_dung' => 2])->assertUnprocessable();
        foreach (['email/send', 'email/verify'] as $path) {
            $this->postJson('/api/auth/'.$path, ['code' => $codeA])->assertStatus(419);
            $this->withHeaders(['Origin' => 'https://foreign.example'])->postAuth($path, ['code' => $codeA])->assertForbidden();
            $this->flushHeaders();
        }
        $this->assertSame(0, NguoiDung::whereNotNull('ngay_xac_minh_email')->count());
        session()->invalidate();
        $this->postAuth('email/verify', ['code' => $codeA])->assertUnauthorized();
        $this->postAuth('email/send')->assertUnauthorized();
    }

    public function test_verified_and_legacy_accounts_can_login_but_forged_unverified_session_cannot(): void
    {
        $this->register();
        $user = NguoiDung::sole();
        $this->actingAs($user)->withSession(['auth_password_fingerprint' => PasswordSession::fingerprint($user)])->getJson('/api/auth/me')->assertUnauthorized();
        $user->setAttribute('duoc_mien_xac_minh_email', true);
        $user->save();
        Auth::forgetGuards();
        $this->postAuth('login', ['email' => 'verify@example.test', 'password' => ' Verify-password!123 '])->assertOk();
        $this->assertNull($user->fresh()->getAttribute('ngay_xac_minh_email'));
    }

    public function test_password_reset_does_not_verify_email_and_invalidates_old_verification_binding(): void
    {
        $code = $this->register();
        $oldSession = session()->all();
        $this->postAuth('password/request', ['email' => 'verify@example.test'])->assertStatus(202);
        $resetCode = Mail::sent(PasswordResetCode::class)->last()->code;
        $this->postAuth('password/verify', ['email' => 'verify@example.test', 'code' => $resetCode])->assertOk();
        $this->postAuth('password/complete', ['email' => 'verify@example.test', 'password' => 'Changed-password123', 'password_confirmation' => 'Changed-password123'])->assertOk();
        $this->assertFalse(NguoiDung::sole()->canUseAccount());
        $this->withSession($oldSession)->postAuth('email/verify', ['code' => $code])->assertUnauthorized();
        $this->postAuth('login', ['email' => 'verify@example.test', 'password' => 'Changed-password123'])->assertForbidden()->assertJsonPath('code', 'email_unverified');
    }

    public function test_transaction_failure_keeps_account_unverified_and_code_unused(): void
    {
        $code = $this->register();
        DB::unprepared("CREATE TRIGGER fail_verification BEFORE UPDATE OF ngay_su_dung ON yeu_cau_xac_minh_email BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END");
        $this->postAuth('email/verify', ['code' => $code])->assertStatus(500);
        $this->assertFalse(NguoiDung::sole()->canUseAccount());
        $this->assertNull(YeuCauXacMinhEmail::sole()->getAttribute('ngay_su_dung'));
        DB::unprepared('DROP TRIGGER fail_verification');
        $this->postAuth('email/verify', ['code' => $code])->assertOk();
    }

    public function test_mail_failure_keeps_pending_account_recoverable_without_code_in_logs(): void
    {
        config(['mail.default' => 'log']);
        $this->postAuth('register', ['name' => 'Member', 'email' => 'verify@example.test', 'password' => 'password12345', 'password_confirmation' => 'password12345'])->assertCreated()->assertJsonPath('mail_sent', false);
        Mail::assertNothingSent();
        $this->assertFalse(NguoiDung::sole()->canUseAccount());
        $this->postAuth('email/send')->assertStatus(503);
        config(['mail.default' => 'smtp']);
        Mail::shouldReceive('mailer')->with('smtp')->andThrow(new \RuntimeException('SENSITIVE-MAIL-CANARY'));
        $response = $this->postAuth('email/send')->assertStatus(503);
        $this->assertStringNotContainsString('SENSITIVE', $response->getContent());
        $this->assertNotNull(YeuCauXacMinhEmail::sole()->getAttribute('ngay_huy'));
    }

    public function test_hourly_email_limit_cannot_be_reset_by_new_pending_sessions(): void
    {
        $this->register();
        for ($i = 1; $i < 10; $i++) {
            $this->travel(61)->seconds();
            $this->postAuth('email/send')->assertStatus(202);
        }
        $this->travel(61)->seconds();
        $this->postAuth('email/send')->assertStatus(429);
        Mail::assertSentCount(10);
    }

    public function test_logs_are_redacted_and_include_verification_events(): void
    {
        $folder = storage_path('framework/testing/email-log-'.bin2hex(random_bytes(6)));
        mkdir($folder, 0700, true);
        foreach (['application', 'security'] as $channel) {
            config(["logging.channels.$channel" => ['driver' => 'single', 'path' => "$folder/$channel.log"]]);
            Log::forgetChannel($channel);
        }
        $code = $this->register();
        $this->postAuth('email/verify', ['code' => $code])->assertOk();
        $content = implode('', array_map('file_get_contents', glob("$folder/*.log")));
        foreach ([$code, 'Verify-password!123', 'verify@example.test', 'verification-test-csrf'] as $secret) {
            $this->assertStringNotContainsString($secret, $content);
        }
        foreach (['auth.email.mail_sent', 'auth.email.verify', 'request_id'] as $event) {
            $this->assertStringContainsString($event, $content);
        }
        foreach (['application', 'security'] as $channel) {
            Log::forgetChannel($channel);
        }
        foreach (glob("$folder/*.log") as $file) {
            unlink($file);
        } rmdir($folder);
    }
}

class EmailCsrf extends ValidateCsrfToken
{
    protected function runningUnitTests(): bool
    {
        return false;
    }
}
