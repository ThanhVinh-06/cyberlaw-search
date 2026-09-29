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
