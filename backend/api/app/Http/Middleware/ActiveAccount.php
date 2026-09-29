<?php

namespace App\Http\Middleware;

use App\Models\NguoiDung;
use App\Support\PasswordSession;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActiveAccount
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $currentPassword = $user instanceof NguoiDung && hash_equals(PasswordSession::fingerprint($user), (string) $request->session()->get('auth_password_fingerprint', ''));
        if (! $user instanceof NguoiDung || $user->getAttribute('trang_thai') !== 'active' || ! $user->canUseAccount() || ! $currentPassword) {
            $request->attributes->set('auth_reason', $user instanceof NguoiDung && $user->getAttribute('trang_thai') !== 'active' ? 'account_blocked' : 'session_invalid');
            if ($user) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json(['message' => 'Phiên đăng nhập đã hết hạn. Bạn hãy đăng nhập lại.'], 401);
        }

        return $next($request);
    }
}
