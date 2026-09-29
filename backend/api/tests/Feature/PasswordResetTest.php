<?php

namespace Tests\Feature;

use App\Mail\PasswordResetCode;
use App\Models\NguoiDung;
use App\Models\YeuCauDatLaiMatKhau as ResetRequest;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Tests\Support\AccountSchema;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        AccountSchema::create();
        config(['mail.default' => 'smtp', 'logging.channels.application' => config('logging.channels.null'), 'logging.channels.security' => config('logging.channels.null')]);
        $this->app->bind(ValidateCsrfToken::class, ResetCsrf::class);
        Mail::fake();
    }

    private function account(): NguoiDung
    {
        $user = new NguoiDung(['ho_ten' => 'Reset test', 'thu_dien_tu' => 'reset@example.test', 'mat_khau' => ' Old-password!123 ']);
        $user->setAttribute('duoc_mien_xac_minh_email', true);
        $user->save();

        return $user;
    }

    private function postReset(string $action, array $data = [])
    {
        return $this->withSession(['_token' => 'reset-csrf'])->postJson('/api/auth/password/'.$action,
            array_merge(['email' => 'reset@example.test'], $data), ['X-CSRF-TOKEN' => 'reset-csrf']);
    }

    private function send(): string
    {
        $this->postReset('request')->assertStatus(202)->assertJsonMissingPath('code');

        return Mail::sent(PasswordResetCode::class)->last()->code;
    }

    private function complete(array $data = [])
    {
        return $this->postReset('complete', array_merge(['password' => ' New-password!123 ', 'password_confirmation' => ' New-password!123 '], $data));
    }

    public function test_real_flow_hashes_otp_updates_only_password_and_consumes_once(): void
    {
        $user = $this->account();
        $code = $this->send();
        $record = ResetRequest::firstOrFail();
        $this->assertTrue(Hash::check($code, $record->ma_xac_nhan_bam));
        $this->assertNull($record->ma_phien_bam);
        $this->complete()->assertUnprocessable();
        $this->postReset('verify', ['code' => $code])->assertOk();
        $this->assertNotSame(session('password_reset.grant'), $record->fresh()->ma_phien_bam);
        $verifiedSession = session()->all();
        $this->complete(['vai_tro' => 'admin', 'ma_nguoi_dung' => 999])->assertOk();
        $this->assertTrue(Hash::check(' New-password!123 ', $user->fresh()->mat_khau));
        $this->assertFalse(Hash::check(' Old-password!123 ', $user->fresh()->mat_khau));
        $this->assertSame('user', $user->fresh()->vai_tro);
        $this->assertNotNull($record->fresh()->ngay_su_dung);
        $this->assertNull(session('password_reset'));
        $after = $user->fresh()->mat_khau;
        $this->withSession($verifiedSession)->complete()->assertUnprocessable();
        $this->assertSame($after, $user->fresh()->mat_khau);
    }

    public function test_unknown_and_blocked_email_return_same_metadata_without_mail_or_records(): void
    {
        $missing = $this->postReset('request')->assertStatus(202)->json();
        $this->travel(31)->seconds();
        $user = $this->account();
        $user->trang_thai = 'blocked';
        $user->save();
        $blocked = $this->postReset('request')->assertStatus(202)->json();
        $this->assertSame($missing, $blocked);
        Mail::assertNothingSent();
        $this->assertSame(0, ResetRequest::count());
        $this->travel(31)->seconds();
        $user->trang_thai = 'active';
        $user->save();
        $this->assertSame($missing, $this->postReset('request')->assertStatus(202)->json());
        Mail::assertSentCount(1);
    }

    public function test_attempts_commit_and_correct_code_cannot_bypass_five_failures(): void
    {
        $user = $this->account();
        $before = $user->mat_khau;
        $code = $this->send();
        $wrong = $code === '000000' ? '111111' : '000000';
        for ($i = 1; $i <= 5; $i++) {
            $this->postReset('verify', ['code' => $wrong])->assertUnprocessable();
            $this->assertSame($i, ResetRequest::first()->so_lan_thu);
        }
        $this->postReset('verify', ['code' => $code])->assertUnprocessable()->assertJsonPath('code', 'reset_locked');
        $this->complete()->assertUnprocessable();
        $this->assertSame($before, $user->fresh()->mat_khau);
    }

    public function test_cooldown_survives_session_change_and_resend_revokes_verified_grant(): void
    {
        $this->account();
        $code = $this->send();
        $this->postReset('verify', ['code' => $code])->assertOk();
        $old = session()->all();
        session()->invalidate();
        $this->postReset('request')->assertStatus(429);
        $this->travel(31)->seconds();
        $newCode = $this->send();
        $new = session()->all();
        $this->assertNotNull(ResetRequest::orderBy('ma_yeu_cau')->first()->ngay_huy);
        $this->withSession($old)->complete()->assertUnprocessable();
        $this->withSession($new)->postReset('verify', ['code' => $newCode])->assertOk();
        $this->complete()->assertOk();
    }

    public function test_expiry_is_enforced_for_code_and_verified_grant(): void
    {
        $user = $this->account();
        $before = $user->mat_khau;
        $code = $this->send();
        $this->travel(301)->seconds();
        $this->postReset('verify', ['code' => $code])->assertUnprocessable();
        $code = $this->send();
        $this->postReset('verify', ['code' => $code])->assertOk();
        $this->travel(301)->seconds();
        $this->complete()->assertUnprocessable();
        $this->assertSame($before, $user->fresh()->mat_khau);
    }

    public function test_session_binding_email_mismatch_and_block_after_verify_are_rejected(): void
    {
        $user = $this->account();
        $before = $user->mat_khau;
        $code = $this->send();
        $binding = session()->all();
        session()->invalidate();
        $this->postReset('verify', ['code' => $code, 'ma_yeu_cau' => 1])->assertUnprocessable();
        $this->withSession($binding)->postReset('verify', ['code' => $code, 'email' => 'other@example.test'])->assertUnprocessable();
        $this->withSession($binding)->postReset('verify', ['code' => $code])->assertOk();
        $this->complete(['email' => 'other@example.test'])->assertUnprocessable();
        $user->trang_thai = 'blocked';
        $user->save();
        $this->complete()->assertUnprocessable();
        $this->assertSame($before, $user->fresh()->mat_khau);
    }

    public function test_password_validation_preserves_grant_without_changing_account(): void
    {
        $user = $this->account();
        $before = $user->mat_khau;
        $code = $this->send();
        $this->postReset('verify', ['code' => $code])->assertOk();
        foreach (['short', str_repeat('a', 73), str_repeat('ề', 25), "valid123\0bad", ['unexpected' => 'array']] as $password) {
            $this->complete(['password' => $password, 'password_confirmation' => $password])->assertUnprocessable();
        }
        $this->complete(['password_confirmation' => 'mismatch'])->assertUnprocessable();
        $this->assertSame($before, $user->fresh()->mat_khau);
        $this->assertNull(ResetRequest::first()->ngay_su_dung);
        $this->complete()->assertOk();
    }

    public function test_csrf_origin_and_rate_limits_prevent_writes_and_mail(): void
    {
        $this->account();
        foreach (['request', 'verify', 'complete'] as $action) {
            $this->postJson('/api/auth/password/'.$action)->assertStatus(419);
            $this->withHeaders(['Origin' => 'https://foreign.example'])->postReset($action)->assertForbidden();
            $this->flushHeaders();
        }
        $this->assertSame(0, ResetRequest::count());
        Mail::assertNothingSent();
        for ($i = 0; $i < 5; $i++) {
            $this->postReset('request', ['email' => "absent$i@example.test"])->assertStatus(202);
        }
        $this->postReset('request')->assertStatus(429);
        Mail::assertNothingSent();
    }

    public function test_reset_revokes_previous_login_on_next_protected_request(): void
    {
        $this->account();
        $this->withSession(['_token' => 'reset-csrf'])->postJson('/api/auth/login', [
            'email' => 'reset@example.test', 'password' => ' Old-password!123 ',
        ], ['X-CSRF-TOKEN' => 'reset-csrf'])->assertOk();
        $old = session()->all();
        $code = $this->send();
        $this->postReset('verify', ['code' => $code])->assertOk();
        $this->complete()->assertOk();
        Auth::forgetGuards();
        $this->withSession($old)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_log_mailer_fails_closed_and_smtp_failure_cancels_code_without_leaking_exception(): void
    {
        $this->account();
        config(['mail.default' => 'log']);
        $this->postReset('request')->assertStatus(503);
        $this->assertSame(0, ResetRequest::count());
        config(['mail.default' => 'smtp']);
        Mail::shouldReceive('mailer')->with('smtp')->once()->andThrow(new \RuntimeException('CANARY-private-smtp-details'));
        $response = $this->postReset('request')->assertStatus(202);
        $this->assertStringNotContainsString('CANARY', $response->getContent());
        $this->assertNotNull(ResetRequest::first()->ngay_huy);
        $this->complete()->assertUnprocessable();
    }

    public function test_database_failure_rolls_back_password_and_consumption(): void
    {
        $user = $this->account();
        $before = $user->mat_khau;
        $code = $this->send();
        $this->postReset('verify', ['code' => $code])->assertOk();
        DB::unprepared("CREATE TRIGGER fail_reset BEFORE UPDATE OF ngay_su_dung ON yeu_cau_dat_lai_mat_khau BEGIN SELECT RAISE(ABORT, 'synthetic database failure'); END");
        $this->complete()->assertStatus(500);
        $this->assertSame($before, $user->fresh()->mat_khau);
        $this->assertNull(ResetRequest::first()->ngay_su_dung);
        DB::unprepared('DROP TRIGGER fail_reset');
        $this->complete()->assertOk();
    }

    public function test_reset_logs_have_events_and_request_ids_without_otp_password_or_email(): void
    {
        $directory = storage_path('framework/testing/reset-log-'.bin2hex(random_bytes(6)));
        mkdir($directory, 0700, true);
        foreach (['application', 'security'] as $channel) {
            config(["logging.channels.$channel.driver" => 'daily', "logging.channels.$channel.path" => "$directory/$channel.log"]);
            Log::forgetChannel($channel);
        }
        $this->account();
        $code = $this->send();
        $this->postReset('verify', ['code' => $code])->assertOk();
        $grant = session('password_reset.grant');
        $this->complete()->assertOk();
        $contents = implode('', array_map('file_get_contents', glob($directory.'/*.log')));
        foreach ([$code, $grant, 'reset@example.test', 'New-password!123'] as $secret) {
            $this->assertStringNotContainsString($secret, $contents);
        }
        foreach (['auth.reset.request', 'auth.reset.mail_sent', 'auth.reset.verify', 'auth.reset.complete', 'request_id'] as $event) {
            $this->assertStringContainsString($event, $contents);
        }
        foreach (['application', 'security'] as $channel) {
            Log::forgetChannel($channel);
        }
        foreach (glob($directory.'/*.log') as $file) {
            unlink($file);
        }
        rmdir($directory);
    }
}

class ResetCsrf extends ValidateCsrfToken
{
    protected function runningUnitTests(): bool
    {
        return false;
    }
}
