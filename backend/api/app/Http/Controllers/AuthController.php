<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function csrf(Request $request): JsonResponse
    {
        return response()->json(['csrf_token' => $request->session()->token()]);
    }

    public function login(Request $request): JsonResponse
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
        $accepted = Auth::guard('web')->attemptWhen([
            'thu_dien_tu' => mb_strtolower(trim($data['email'])),
            'password' => $data['password'],
        ], function ($user) use ($request) {
            if ($user->trang_thai !== 'active') {
                $request->attributes->set('auth_reason', 'account_blocked');

                return false;
            }

            return true;
        }, false);

        if (! $accepted) {
            return response()->json(['message' => 'Email hoặc mật khẩu không chính xác.'], 401);
        }

        // No session is considered successful if persisting the login timestamp fails.
        try {
            $user = Auth::user();
            $user->lan_dang_nhap_cuoi = now();
            $user->save();
        } catch (\Throwable $exception) {
            Auth::logout();
            $request->session()->invalidate();
            throw $exception;
        }
        $request->session()->regenerate();

        return $this->me($request);
    }

    public function me(Request $request): JsonResponse
    {
        // Explicit output allowlist: never return password/remember-token or future private fields.
        return response()->json(['user' => $request->user()->only([
            'ma_nguoi_dung', 'ho_ten', 'thu_dien_tu', 'vai_tro', 'trang_thai',
            'ngay_tao', 'ngay_cap_nhat', 'lan_dang_nhap_cuoi',
        ])]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->attributes->set('auth_actor', $request->user()?->only(['ma_nguoi_dung', 'vai_tro']));
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Bạn đã đăng xuất.']);
    }
}
