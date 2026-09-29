<?php

namespace App\Http\Controllers;

use App\Mail\PasswordResetCode;
use App\Models\NguoiDung;
use App\Models\YeuCauDatLaiMatKhau as ResetRequest;
use App\Support\SafeLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Timebox;

final class PasswordResetController extends Controller
{
    private function email(Request $request): string
    {
        $data = $request->validate(['email' => ['required', 'string', 'email', 'max:191']]);

        return mb_strtolower(trim($data['email']));
    }

    public function send(Request $request): JsonResponse
    {
        $email = $this->email($request);
        // Explicit SMTP only: never fall back to a mailer which writes the OTP into logs.
        abort_unless(config('mail.default') === 'smtp' && config('mail.mailers.smtp.transport') === 'smtp', 503);
        $key = 'reset-cooldown:'.hash_hmac('sha256', $email, config('app.key'));
        $allowed = Cache::lock($key.':lock', 5)->block(3, fn () => RateLimiter::attempt($key, 1, fn () => true, 30));
        if (! $allowed) {
            return response()->json(['code' => 'reset_cooldown', 'message' => 'Bạn hãy chờ 30 giây trước khi gửi lại mã.'], 429);
        }

        return (new Timebox)->call(function () use ($request, $email) {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $hash = Hash::make($code); // Same hashing work even when an account is unknown/blocked.
            $expires = now()->addMinutes(5);
            $record = DB::transaction(function () use ($email, $hash, $expires) {
                $user = NguoiDung::where('thu_dien_tu', $email)->lockForUpdate()->first();
                if (! $user || $user->trang_thai !== 'active') {
                    return null;
                }
                ResetRequest::where('ma_nguoi_dung', $user->getKey())->whereNull('ngay_su_dung')->whereNull('ngay_huy')->update(['ngay_huy' => now()]);

                return ResetRequest::create([
                    'ma_nguoi_dung' => $user->getKey(), 'ma_xac_nhan_bam' => $hash,
                    'ngay_het_han' => $expires, 'so_lan_thu' => 0,
                ]);
            });
            // Binding lives only in the server session, never in URLs or browser storage.
            $request->session()->put('password_reset', [
                'id' => $record?->getKey(), 'user_id' => $record?->ma_nguoi_dung,
                'email' => $email, 'expires' => $expires->timestamp, 'attempts' => 0,
            ]);
            if ($record) {
                try {
                    Mail::mailer('smtp')->to($email)->send(new PasswordResetCode($code));
                    $event = 'auth.reset.mail_sent';
                } catch (\Throwable) {
                    ResetRequest::whereKey($record->getKey())->whereNull('ngay_su_dung')->update(['ngay_huy' => now()]);
                    $event = 'auth.reset.mail_failed';
                }
                SafeLog::write('security', $event, $event === 'auth.reset.mail_sent' ? 'success' : 'failure', [
                    'request_id' => $request->attributes->get('request_id'),
                    'route' => 'auth.reset.request',
                ]);
            }

            return response()->json([
                'message' => 'Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận được mã xác nhận. Bạn hãy kiểm tra hộp thư và thư rác.',
                'expires_in' => 300, 'resend_after' => 30,
            ], 202);
        }, app()->runningUnitTests() ? 0 : 800000);
    }

    public function verify(Request $request): JsonResponse
    {
        return (new Timebox)->call(fn () => $this->verifyCode($request), app()->runningUnitTests() ? 0 : 800000);
    }

    private function verifyCode(Request $request): JsonResponse
    {
        $email = $this->email($request);
        $data = $request->validate(['code' => ['required', 'string', 'regex:/^[0-9]{6}$/D']]);
        $binding = $request->session()->get('password_reset', []);
        $grant = bin2hex(random_bytes(32));
        $reason = 'reset_invalid';
        $success = DB::transaction(function () use ($email, $data, $binding, $grant, &$reason) {
            [$user, $record] = $this->lockedChallenge($binding, $email);
            if (! $user || ! $record) {
                return false;
            }
            if ($record->ngay_het_han->lte(now())) {
                $reason = 'reset_expired';

                return false;
            }
            if ($record->so_lan_thu >= 5) {
                $reason = 'reset_locked';

                return false;
            }
            if ($record->ngay_xac_nhan) {
                $reason = 'reset_replay';

                return false;
            }
            if (! Hash::check($data['code'], $record->ma_xac_nhan_bam)) {
                $record->so_lan_thu++;
                $record->save(); // Commit failed attempts; do not throw inside this transaction.
                $reason = $record->so_lan_thu >= 5 ? 'reset_locked' : 'reset_invalid';

                return false;
            }
            $record->ngay_xac_nhan = now();
            $record->ma_phien_bam = hash('sha256', $grant);
            $record->save();

            return true;
        });
        if (! $success) {
            $binding['attempts'] = min(5, ($binding['attempts'] ?? 0) + 1);
            $request->session()->put('password_reset', $binding);

            // Unknown accounts get the same response/attempt schedule as known accounts.
            return $this->invalid($request, $binding['attempts'] >= 5 ? 'reset_locked' : $reason);
        }
        $binding['grant'] = $grant;
        $request->session()->regenerate();
        $request->session()->put('password_reset', $binding);

        return response()->json(['message' => 'Đã xác nhận mã. Bạn có thể nhập mật khẩu mới.']);
    }

    public function complete(Request $request): JsonResponse
    {
        $email = $this->email($request);
        $data = $request->validate([
            'password' => ['bail', 'required', 'string', 'min:8', 'max:72', 'confirmed', function ($attribute, $value, $fail) {
                if (strlen($value) > 72 || str_contains($value, "\0")) {
                    $fail('Mật khẩu tối đa 72 byte và không chứa ký tự null.');
                }
            }],
            'password_confirmation' => ['required', 'string', 'max:72'],
        ]);
        $binding = $request->session()->get('password_reset', []);
        if (empty($binding['grant'])) {
            return $this->invalid($request, 'reset_unverified');
        }
        $hash = Hash::make($data['password']);
        $success = DB::transaction(function () use ($email, $binding, $hash) {
            [$user, $record] = $this->lockedChallenge($binding, $email);
            if (! $user || ! $record || $record->ngay_het_han->lte(now()) || ! $record->ngay_xac_nhan
                || ! hash_equals($record->ma_phien_bam, hash('sha256', $binding['grant']))) {
                return false;
            }
            $user->mat_khau = $hash;
            $user->ma_ghi_nho = bin2hex(random_bytes(30));
            $user->save();
            $record->ngay_su_dung = now();
            $record->save();
            ResetRequest::where('ma_nguoi_dung', $user->getKey())->whereNull('ngay_su_dung')->whereNull('ngay_huy')->update(['ngay_huy' => now()]);

            return true;
        });
        if (! $success) {
            return $this->invalid($request, 'reset_replay');
        }
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Đổi mật khẩu thành công. Bạn hãy đăng nhập bằng mật khẩu mới.']);
    }

    private function lockedChallenge(array $binding, string $email): array
    {
        if (($binding['email'] ?? '') !== $email || empty($binding['id']) || empty($binding['user_id'])) {
            return [null, null];
        }
        // Consistent lock order for send, verify and complete; serializes concurrent requests per account.
        $user = NguoiDung::whereKey($binding['user_id'])->lockForUpdate()->first();
        if (! $user || $user->trang_thai !== 'active' || $user->thu_dien_tu !== $email) {
            return [null, null];
        }
        $record = ResetRequest::whereKey($binding['id'])->where('ma_nguoi_dung', $user->getKey())
            ->whereNull('ngay_su_dung')->whereNull('ngay_huy')->lockForUpdate()->first();

        return [$user, $record];
    }

    private function invalid(Request $request, string $reason): JsonResponse
    {
        $request->attributes->set('auth_reason', $reason);

        return response()->json([
            'code' => $reason === 'reset_locked' ? 'reset_locked' : 'reset_invalid',
            'message' => $reason === 'reset_locked' ? 'Mã đã hết lượt thử. Bạn hãy gửi lại mã.'
                : 'Mã không hợp lệ hoặc đã hết hạn. Bạn hãy kiểm tra lại hoặc gửi mã mới.',
        ], 422);
    }
}
