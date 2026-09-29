<?php

use App\Http\Middleware\ActiveAccount;
use App\Http\Middleware\AdminOnly;
use App\Http\Middleware\ApiContext;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(ApiContext::class);
        $middleware->alias([
            'account.active' => ActiveAccount::class,
            'role.admin' => AdminOnly::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash(['password', 'password_confirmation', 'mat_khau']);
        $exceptions->report(function (Throwable $exception) {
            // API request summary is logged by ApiContext, never SQL bindings or raw exception context.
            if (request()->is('api/*')) {
                return false;
            }
        });
        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }
            $status = $exception instanceof ValidationException ? 422
                : ($exception instanceof AuthenticationException ? 401
                : ($exception instanceof HttpExceptionInterface
                    ? $exception->getStatusCode() : 500));
            $messages = [
                401 => 'Phiên đăng nhập đã hết hạn. Bạn hãy đăng nhập lại.',
                403 => 'Bạn không có quyền thực hiện thao tác này.',
                404 => 'Không tìm thấy chức năng này.',
                405 => 'Phương thức yêu cầu không hợp lệ.',
                419 => 'Phiên bảo vệ đã hết hạn. Bạn hãy thử lại.',
                422 => 'Bạn hãy kiểm tra lại email và mật khẩu.',
                429 => 'Bạn đã thử quá nhiều lần. Vui lòng chờ một phút rồi thử lại.',
            ];
            $headers = $exception instanceof HttpExceptionInterface
                ? $exception->getHeaders() : [];
            $request->attributes->set('auth_reason', $status >= 500
                ? ($exception instanceof QueryException ? 'database_error' : 'internal_error')
                : 'http_'.$status);

            return response()->json(['message' => $messages[$status] ?? 'Dịch vụ tạm thời gián đoạn. Bạn hãy thử lại sau.'], $status, $headers);
        });
    })->create();
