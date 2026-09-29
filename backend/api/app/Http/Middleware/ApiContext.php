<?php

namespace App\Http\Middleware;

use App\Support\SafeLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ApiContext
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->is('api/*')) {
            return $next($request);
        }

        $start = microtime(true);
        $request->attributes->set('request_id', (string) Str::uuid());
        // All API errors must be JSON, including requests missing Accept.
        $request->headers->set('Accept', 'application/json');
        $origin = $request->header('Origin');
        if ($origin !== null && ! in_array($origin, config('cyberlaw.frontend_origins'), true)) {
            $response = response()->json(['message' => 'Nguồn yêu cầu không được phép.'], 403);
        } elseif ((int) $request->header('Content-Length', 0) > 8192 || strlen($request->getContent()) > 8192) {
            $response = response()->json(['message' => 'Dữ liệu gửi lên quá lớn.'], 413);
        } else {
            $response = $next($request);
        }

        $status = $response->getStatusCode();
        try {
            $actor = $request->attributes->get('auth_actor') ?? $request->user()?->only(['ma_nguoi_dung', 'vai_tro']);
        } catch (\Throwable) {
            $actor = null; // Logging must still work when loading the account fails (e.g. DB offline).
        }
        $context = [
            'request_id' => $request->attributes->get('request_id'),
            'route' => $request->route()?->getName() ?? 'api.unmatched',
            'method' => $request->method(), 'status' => $status,
            'duration_ms' => (int) round((microtime(true) - $start) * 1000),
            'actor_id' => $actor['ma_nguoi_dung'] ?? null,
            'actor_role' => $actor['vai_tro'] ?? null,
            'error_code' => $request->attributes->get('auth_reason'),
        ];
        SafeLog::write('application', 'http.completed', $status < 400 ? 'success' : 'failure', $context);
        $route = $context['route'];
        if (str_starts_with($route, 'auth.reset.') || in_array($route, ['auth.login', 'auth.logout', 'auth.register']) || in_array($status, [401, 403, 419, 429])) {
            $event = $status === 429 ? 'auth.rate_limited'
                : (str_starts_with($route, 'auth.reset.') || in_array($route, ['auth.login', 'auth.logout', 'auth.register']) ? $route : 'auth.denied');
            SafeLog::write('security', $event, $status < 400 ? 'success' : 'failure', $context);
        }
        $response->headers->set('X-Request-ID', $context['request_id']);
        $response->headers->set('Cache-Control', 'no-store, private');
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }
}
