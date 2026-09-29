<?php

namespace App\Http\Controllers;

use App\Models\NguoiDung;
use App\Services\EmailVerification;
use App\Support\PasswordSession;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\SessionGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function csrf(Request $request): JsonResponse
    {
        return response()->json(['csrf_token' => $request->session()->token()]);
    }

    public function login(Request $request, EmailVerification $verification): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:191'],
            'password' => ['required', 'string', 'max:128'],
        ], [
            'email.required' => 'Bạn hãy nhập địa chỉ email.',
            'email.email' => 'Địa chỉ email chưa đúng định dạng.',
            'password.required' => 'Bạn hãy nhập mật khẩu.',
        ]);

        // Bcrypt only processes the first 72 bytes; reject longer input rather than accepting an alias.
        if (strlen($data['password']) > 72) {
            return response()->json(['message' => 'Bạn hãy kiểm tra lại email và mật khẩu.'], 422);
        }

        // SessionGuard uses a timebox even when an email is unknown. Password is never trimmed.
        $guard = Auth::guard('web');
        if (! $guard instanceof SessionGuard) {
            throw new \LogicException('The web guard must use session authentication.');
        }
        $pendingUser = null;
        $accepted = $guard->attemptWhen([
            'thu_dien_tu' => mb_strtolower(trim($data['email'])),
            'password' => $data['password'],
        ], function ($user) use ($request, &$pendingUser) {
            if (! $user instanceof NguoiDung) {
                return false;
            }
            if ($user->getAttribute('trang_thai') !== 'active') {
                $request->attributes->set('auth_reason', 'account_blocked');

                return false;
            }

            if (! $user->canUseAccount()) {
                $pendingUser = $user;

                return false;
            }

            return true;
        }, false);

        if (! $accepted) {
            if ($pendingUser instanceof NguoiDung) {
                $guard->logout();
                $request->session()->invalidate();
                $verification->begin($request, $pendingUser);
                $request->attributes->set('auth_reason', 'email_unverified');

                return response()->json(['code' => 'email_unverified', 'message' => 'Bạn hãy xác minh email trước khi đăng nhập.'], 403);
            }

            return response()->json(['message' => 'Email hoặc mật khẩu không chính xác.'], 401);
        }

        // No session is considered successful if persisting the login timestamp fails.
        try {
            $user = $guard->user();
            if (! $user instanceof NguoiDung) {
                throw new AuthenticationException;
            }
            $user->setAttribute('lan_dang_nhap_cuoi', now());
            $user->save();
        } catch (\Throwable $exception) {
            Auth::logout();
            $request->session()->invalidate();
            throw $exception;
        }
        $request->session()->regenerate();
        $request->session()->put('auth_password_fingerprint', PasswordSession::fingerprint($user));

        return $this->me($request);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof NguoiDung) {
            throw new AuthenticationException;
        }

        // Explicit output allowlist: never return password/remember-token or future private fields.
        return response()->json(['user' => $user->only([
            'ma_nguoi_dung', 'ho_ten', 'thu_dien_tu', 'vai_tro', 'trang_thai',
            'ngay_tao', 'ngay_cap_nhat', 'lan_dang_nhap_cuoi',
        ])]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->attributes->set('auth_actor', $user instanceof NguoiDung ? $user->only(['ma_nguoi_dung', 'vai_tro']) : null);
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Bạn đã đăng xuất.']);
    }
}
