<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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
        RateLimiter::for('knowledge-read', fn (Request $request) => Limit::perMinute(120)->by('knowledge-read:'.$request->user()?->getAuthIdentifier()));
        RateLimiter::for('knowledge-write', fn (Request $request) => Limit::perMinute(30)->by('knowledge-write:'.$request->user()?->getAuthIdentifier()));
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
