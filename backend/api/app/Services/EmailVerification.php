<?php

namespace App\Services;

use App\Mail\EmailVerificationCode;
use App\Models\NguoiDung;
use App\Models\YeuCauXacMinhEmail;
use App\Support\PasswordSession;
use App\Support\SafeLog;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

final class EmailVerification
{
    public function begin(Request $request, NguoiDung $user): void
    {
        $request->session()->regenerate(true);
        $request->session()->put('email_verification', [
            'user_id' => $user->getKey(), 'email' => $user->getAttribute('thu_dien_tu'),
            'fingerprint' => PasswordSession::fingerprint($user), 'expires' => now()->addMinutes(30)->timestamp,
        ]);
    }

    public function pendingUser(Request $request, bool $lock = false): NguoiDung
    {
        $binding = $request->session()->get('email_verification', []);
        abort_if($request->user() || empty($binding['user_id']) || ($binding['expires'] ?? 0) <= now()->timestamp, 401);
        $query = NguoiDung::whereKey($binding['user_id']);
        $user = ($lock ? $query->lockForUpdate() : $query)->first();
        if (! $user instanceof NguoiDung || $user->getAttribute('trang_thai') !== 'active'
            || $user->canUseAccount() || $user->getAttribute('thu_dien_tu') !== ($binding['email'] ?? '')
            || ! hash_equals(PasswordSession::fingerprint($user), (string) ($binding['fingerprint'] ?? ''))) {
            throw new AuthenticationException;
        }

        return $user;
    }

    public function status(Request $request): array
    {
        $user = $this->pendingUser($request);
        $record = YeuCauXacMinhEmail::whereKey($request->session()->get('email_verification.request_id'))
            ->where('ma_nguoi_dung', $user->getKey())->first();

        return [
            'email' => $user->getAttribute('thu_dien_tu'),
            'expires_in' => $record && ! $record->ngay_huy && ! $record->ngay_su_dung ? max(0, $record->ngay_het_han->timestamp - now()->timestamp) : 0,
            'resend_after' => RateLimiter::availableIn($this->key($user).':cooldown'),
            'locked' => $record && $record->so_lan_thu >= 5,
        ];
    }

    private function key(NguoiDung $user): string
    {
        return 'verify-email:'.hash_hmac('sha256', (string) $user->getKey(), config('app.key'));
    }

    public function send(Request $request): array
    {
        $user = $this->pendingUser($request);
        abort_unless(config('mail.default') === 'smtp' && config('mail.mailers.smtp.transport') === 'smtp', 503);
        $key = $this->key($user);
        $allowed = Cache::lock($key.':lock', 5)->block(3, function () use ($key) {
            if (RateLimiter::tooManyAttempts($key.':hour', 10) || RateLimiter::tooManyAttempts($key.':cooldown', 1)) {
                return false;
            }
            RateLimiter::hit($key.':hour', 3600);
            RateLimiter::hit($key.':cooldown', 30);

            return true;
        });
        abort_unless($allowed, 429);
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $hash = Hash::make($code);
        $record = DB::transaction(function () use ($request, $hash) {
            $user = $this->pendingUser($request, true);
            YeuCauXacMinhEmail::where('ma_nguoi_dung', $user->getKey())->whereNull('ngay_su_dung')->whereNull('ngay_huy')->update(['ngay_huy' => now()]);

            return YeuCauXacMinhEmail::create(['ma_nguoi_dung' => $user->getKey(), 'ma_xac_nhan_bam' => $hash, 'ngay_het_han' => now()->addMinutes(5), 'so_lan_thu' => 0]);
        });
        $request->session()->put('email_verification.request_id', $record->getKey());
        try {
            Mail::mailer('smtp')->to($user->getAttribute('thu_dien_tu'))->send(new EmailVerificationCode($code));
        } catch (\Throwable) {
            YeuCauXacMinhEmail::whereKey($record->getKey())->update(['ngay_huy' => now()]);
            $this->log($request, 'auth.email.mail_failed', 'failure');
            abort(503);
        }
        $this->log($request, 'auth.email.mail_sent', 'success');

        return $this->status($request);
    }

    public function verify(Request $request, string $code): string
    {
        return DB::transaction(function () use ($request, $code) {
            $user = $this->pendingUser($request, true);
            $record = YeuCauXacMinhEmail::whereKey($request->session()->get('email_verification.request_id'))
                ->where('ma_nguoi_dung', $user->getKey())->lockForUpdate()->first();
            if (! $record || $record->ngay_huy || $record->ngay_su_dung) {
                return 'verification_invalid';
            }
            if ($record->ngay_het_han->lte(now())) {
                return 'verification_expired';
            }
            if ($record->so_lan_thu >= 5) {
                return 'verification_locked';
            }
            if (! Hash::check($code, $record->ma_xac_nhan_bam)) {
                $record->increment('so_lan_thu');

                return $record->so_lan_thu >= 5 ? 'verification_locked' : 'verification_invalid';
            }
            $user->setAttribute('ngay_xac_minh_email', now());
            $user->save();
            $record->ngay_su_dung = now();
            $record->save();
            YeuCauXacMinhEmail::where('ma_nguoi_dung', $user->getKey())->whereNull('ngay_su_dung')->whereNull('ngay_huy')->update(['ngay_huy' => now()]);

            return 'verified';
        });
    }

    private function log(Request $request, string $event, string $outcome): void
    {
        SafeLog::write('security', $event, $outcome, ['request_id' => $request->attributes->get('request_id'), 'route' => $request->route()?->getName()]);
    }
}
