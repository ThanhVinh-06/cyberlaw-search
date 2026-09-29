<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActiveAccount
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (! $user || $user->trang_thai !== 'active') {
            $request->attributes->set('auth_reason', $user ? 'account_blocked' : 'session_invalid');
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
