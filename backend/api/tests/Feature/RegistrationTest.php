<?php

namespace Tests\Feature;

use App\Mail\EmailVerificationCode;
use App\Models\NguoiDung;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Psr\Log\AbstractLogger;
use Tests\Support\AccountSchema;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        AccountSchema::create();
        config(['logging.channels.application' => config('logging.channels.null'), 'logging.channels.security' => config('logging.channels.null')]);
        $this->app->bind(ValidateCsrfToken::class, RegistrationCsrf::class);
        config(['mail.default' => 'smtp']);
        Mail::fake();
    }

    private function payload(array $extra = []): array
    {
        return array_merge(['name' => ' Test Member ', 'email' => ' MEMBER@example.test ',
            'password' => ' Register-fixture!123 ', 'password_confirmation' => ' Register-fixture!123 '], $extra);
    }

    private function register(array $extra = [])
    {
        return $this->withSession(['_token' => 'registration-csrf'])->postJson('/api/auth/register', $this->payload($extra), ['X-CSRF-TOKEN' => 'registration-csrf']);
    }

    public function test_creates_user_with_hashed_untrimmed_password_then_requires_verification(): void
    {
        $this->register(['vai_tro' => 'admin', 'trang_thai' => 'blocked', 'ma_nguoi_dung' => 99, 'ma_ghi_nho' => 'forged'])->assertCreated()->assertJsonMissingPath('user')->assertHeader('X-Request-ID');
        $user = NguoiDung::sole();
        $this->assertSame('member@example.test', $user->thu_dien_tu);
        $this->assertSame('Test Member', $user->ho_ten);
        $this->assertSame('user', $user->vai_tro);
        $this->assertSame('active', $user->trang_thai);
        $this->assertNull($user->ma_ghi_nho);
        $this->assertNull($user->lan_dang_nhap_cuoi);
        $this->assertTrue(Hash::check(' Register-fixture!123 ', $user->mat_khau));
        $this->assertGuest();
        $this->assertFalse($user->canUseAccount());
        Mail::assertSent(EmailVerificationCode::class);
        $this->postJson('/api/auth/login', ['email' => $user->thu_dien_tu, 'password' => ' Register-fixture!123 '], ['X-CSRF-TOKEN' => session()->token()])->assertForbidden()->assertJsonPath('code', 'email_unverified');
        $this->assertGuest();
    }

    public function test_duplicate_normalized_email_never_overwrites_account(): void
    {
        $this->register()->assertCreated();
        $original = NguoiDung::sole()->getAttributes();
        $this->register(['email' => 'member@example.test', 'name' => 'Replacement'])->assertStatus(409)->assertJsonPath('code', 'registration_conflict');
        $this->assertSame(1, NguoiDung::count());
        $this->assertSame($original, NguoiDung::sole()->getAttributes());
    }

    public function test_invalid_fields_are_rejected_without_writes(): void
    {
        foreach ([['name' => ' '], ['email' => ['invalid']], ['password' => ['invalid']], ['password_confirmation' => 'wrong'], ['password' => 'short', 'password_confirmation' => 'short']] as $data) {
            $this->register($data)->assertUnprocessable();
        }
        $this->assertSame(0, NguoiDung::count());
    }

    public function test_bcrypt_byte_limit_and_null_byte_are_rejected(): void
    {
        foreach ([str_repeat('a', 73), str_repeat('ệ', 25), "null\0password"] as $password) {
            $this->register(['password' => $password, 'password_confirmation' => $password])->assertUnprocessable();
        }
        $this->assertSame(0, NguoiDung::count());
    }

    public function test_csrf_origin_and_payload_limit(): void
    {
        $this->postJson('/api/auth/register', $this->payload())->assertStatus(419);
        $this->withHeaders(['Origin' => 'https://untrusted.example'])->register()->assertForbidden();
        $this->flushHeaders();
        $this->register(['extra' => str_repeat('x', 9000)])->assertStatus(413);
        $this->assertSame(0, NguoiDung::count());
    }

    public function test_rate_limit_counts_changed_emails(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->register(['email' => 'invalid-'.$i])->assertUnprocessable();
        }
        $this->register()->assertStatus(429)->assertHeader('Retry-After');
        $this->assertSame(0, NguoiDung::count());
    }

    public function test_signed_in_account_cannot_create_or_replace_session(): void
    {
        $this->register()->assertCreated();
        $user = NguoiDung::sole();
        $this->actingAs($user);
        $this->register(['email' => 'second@example.test'])->assertStatus(409)->assertJsonPath('code', 'already_authenticated');
        $this->assertAuthenticatedAs($user);
        $this->assertSame(1, NguoiDung::count());
    }

    public function test_database_error_has_no_sensitive_details(): void
    {
        Schema::drop('nguoi_dung');
        config(['app.debug' => true]);
        $response = $this->register()->assertStatus(500);
        $this->assertSame(['message'], array_keys($response->json()));
        $this->assertStringNotContainsString('Register-fixture', $response->getContent());
        $this->assertGuest();
    }

    public function test_hourly_limit_survives_minute_windows(): void
    {
        for ($minute = 0; $minute < 4; $minute++) {
            for ($attempt = 0; $attempt < 5; $attempt++) {
                $this->register(['email' => 'invalid'])->assertUnprocessable();
            }
            $this->travel(61)->seconds();
        }
        $this->register()->assertStatus(429);
        $this->assertSame(0, NguoiDung::count());
        $this->travelBack();
    }

    public function test_registration_events_are_logged_without_credentials(): void
    {
        $events = [];
        $logger = new class($events) extends AbstractLogger
        {
            public function __construct(public array &$events) {}

            public function log($level, string|\Stringable $message, array $context = []): void
            {
                $this->events[] = ['event' => (string) $message, 'context' => $context];
            }
        };
        Log::shouldReceive('channel')->andReturn($logger);
        $this->register(['extra' => ['secret' => 'sensitive-canary']])->assertCreated();
        $this->register()->assertStatus(409);
        $registration = array_values(array_filter($events, fn ($e) => $e['event'] === 'auth.register'));
        $this->assertCount(2, $registration);
        $this->assertSame('success', $registration[0]['context']['outcome']);
        $this->assertSame('failure', $registration[1]['context']['outcome']);
        $this->assertNotEmpty($registration[0]['context']['request_id']);
        $encoded = json_encode($events);
        foreach (['Register-fixture', 'member@example', 'sensitive-canary', 'registration-csrf'] as $secret) {
            $this->assertStringNotContainsString($secret, $encoded);
        }
    }
}

class RegistrationCsrf extends ValidateCsrfToken
{
    protected function runningUnitTests()
    {
        return false;
    }
}
