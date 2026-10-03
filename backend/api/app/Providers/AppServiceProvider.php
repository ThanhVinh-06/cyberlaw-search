<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Gate;
use App\Support\PermissionMatrix;
use App\Models\NguoiDung;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Only register implemented administrative capabilities here. Future
        // private-resource policies must also enforce ownership of each record.
        foreach (PermissionMatrix::rules() as $rule) {
            if (in_array($rule['ma_chuc_nang'], ['quan_ly_van_ban', 'duyet_tri_thuc', 'quan_ly_phan_quyen', 'xem_lich_su_chat', 'chat_ai_cyberlaw'], true)) {
                // First parameter must be nullable so Laravel invokes the closure for guests
                // (Gate::canBeCalledWithUser) and the permission matrix decides for them.
                Gate::define($rule['ma_chuc_nang'], fn (?NguoiDung $user) => $user === null
                    ? ($rule['khach'] ?? false)
                    : ($user->canUseAccount() && ($rule[$user->vai_tro] ?? false)));
            }
        }
        RateLimiter::for('admin-users-read', fn (Request $request) => Limit::perMinute(120)->by('admin-users-read:'.$request->user()?->getAuthIdentifier()));
        RateLimiter::for('history-read', fn (Request $request) => Limit::perMinute(60)->by('history-read:'.$request->user()?->getAuthIdentifier()));
        RateLimiter::for('ai-answer', function (Request $request) {
            $user = $request->user();
            if ($user instanceof NguoiDung) {
                return [Limit::perMinute(6)->by('ai-minute:'.$user->getAuthIdentifier()), Limit::perHour(60)->by('ai-hour:'.$user->getAuthIdentifier())];
            }
            // Guest: bind to the session AND keep a per-IP ceiling (API6: never only by IP).
            // Keys are HMACs so raw session ids/IPs never reach the cache filenames.
            $session = hash_hmac('sha256', (string) $request->session()->getId(), config('app.key'));
            $ip = hash_hmac('sha256', (string) $request->ip(), config('app.key'));

            return [
                Limit::perMinute(4)->by('ai-guest-minute:'.$session),
                Limit::perHour(20)->by('ai-guest-hour:'.$session),
                Limit::perHour(40)->by('ai-guest-ip:'.$ip),
            ];
        });
        RateLimiter::for('history-write', fn (Request $request) => Limit::perMinute(10)->by('history-write:'.$request->user()?->getAuthIdentifier()));
        RateLimiter::for('admin-users-write', fn (Request $request) => Limit::perMinute(30)->by('admin-users-write:'.$request->user()?->getAuthIdentifier()));
        RateLimiter::for('knowledge-read', fn (Request $request) => Limit::perMinute(120)->by('knowledge-read:'.$request->user()?->getAuthIdentifier()));
        RateLimiter::for('knowledge-write', fn (Request $request) => Limit::perMinute(30)->by('knowledge-write:'.$request->user()?->getAuthIdentifier()));
        RateLimiter::for('public-search', fn (Request $request) => Limit::perMinute(60)->by('public-search:'.hash_hmac('sha256', (string) $request->ip(), config('app.key'))));
        RateLimiter::for('email-send', fn (Request $request) => [
            Limit::perMinute(5)->by('email-send-minute:'.hash_hmac('sha256', (string) $request->ip(), config('app.key'))),
            Limit::perHour(20)->by('email-send-hour:'.hash_hmac('sha256', (string) $request->ip(), config('app.key'))),
        ]);
        RateLimiter::for('email-verify', fn (Request $request) => Limit::perMinute(20)->by('email-verify:'.hash_hmac('sha256', (string) $request->ip(), config('app.key'))));
        RateLimiter::for('reset-send', function (Request $request) {
            $email = $request->input('email');
            $email = is_string($email) ? mb_strtolower(trim(mb_substr($email, 0, 191))) : '';
            $identity = hash_hmac('sha256', $email, config('app.key'));
            $ip = hash_hmac('sha256', (string) $request->ip(), config('app.key'));

            return [Limit::perMinute(5)->by('reset-send:'.$ip), Limit::perHour(20)->by('reset-hour:'.$ip), Limit::perHour(10)->by('reset-email:'.$identity)];
        });
        RateLimiter::for('reset-action', function (Request $request) {
            return Limit::perMinute(20)->by('reset-action:'.hash_hmac('sha256', (string) $request->ip(), config('app.key')));
        });
        RateLimiter::for('registration', function (Request $request) {
            $ip = hash_hmac('sha256', (string) $request->ip(), config('app.key'));

            return [Limit::perMinute(5)->by('register-minute:'.$ip), Limit::perHour(20)->by('register-hour:'.$ip)];
        });
        RateLimiter::for('login', function (Request $request) {
            $email = $request->input('email');
            $email = is_string($email) ? mb_strtolower(trim(mb_substr($email, 0, 191))) : '';
            // Keys are opaque; never put raw emails or IPs in logs/cache filenames.
            $identity = hash_hmac('sha256', $email.'|'.$request->ip(), config('app.key'));
            $ip = hash_hmac('sha256', (string) $request->ip(), config('app.key'));

            return [
                Limit::perMinute(5)->by('login-account:'.$identity),
                Limit::perMinute(30)->by('login-ip:'.$ip),
            ];
        });
    }
}
