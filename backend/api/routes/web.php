<?php

use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\KnowledgeController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\PermissionMatrixController;
use App\Http\Controllers\RegistrationController;
use Illuminate\Support\Facades\Route;

// Deliberately in the web group: every request has encrypted cookies, server session and CSRF.
Route::prefix('api/auth')->group(function () {
    Route::get('email/status', [EmailVerificationController::class, 'status'])->middleware('throttle:120,1')->block(15, 15)->name('auth.email.status');
    Route::post('email/send', [EmailVerificationController::class, 'send'])->middleware('throttle:email-send')->block(15, 15)->name('auth.email.send');
    Route::post('email/verify', [EmailVerificationController::class, 'verify'])->middleware('throttle:email-verify')->block(15, 15)->name('auth.email.verify');
    Route::post('password/request', [PasswordResetController::class, 'send'])->middleware('throttle:reset-send')->block(15, 15)->name('auth.reset.request');
    Route::post('password/verify', [PasswordResetController::class, 'verify'])->middleware('throttle:reset-action')->block(15, 15)->name('auth.reset.verify');
    Route::post('password/complete', [PasswordResetController::class, 'complete'])->middleware('throttle:reset-action')->block(15, 15)->name('auth.reset.complete');
    Route::post('register', [RegistrationController::class, 'store'])->middleware('throttle:registration')->block(15, 15)->name('auth.register');
    Route::get('csrf', [AuthController::class, 'csrf'])->middleware('throttle:120,1')->name('auth.csrf');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login')->block(15, 15)->name('auth.login');
    Route::get('me', [AuthController::class, 'me'])->middleware('account.active')->name('auth.me');
    Route::post('logout', [AuthController::class, 'logout'])->name('auth.logout');
});

Route::prefix('api/admin/knowledge')->middleware(['account.active', 'role.admin', 'can:quan_ly_van_ban'])->group(function () {
    Route::get('/', [KnowledgeController::class, 'index'])->middleware('throttle:knowledge-read')->name('knowledge.index');
    Route::get('/list/{table}', [KnowledgeController::class, 'listing'])->whereIn('table', ['van_ban', 'dieu_khoan', 'tu_khoa', 'quy_dinh'])->middleware('throttle:knowledge-read')->name('knowledge.list');
    Route::get('/van_ban/{id}/pdf', [KnowledgeController::class, 'pdf'])->whereNumber('id')->middleware('throttle:knowledge-read')->name('knowledge.pdf');
    Route::post('/van_ban/{id}/status', [KnowledgeController::class, 'status'])->whereNumber('id')->middleware('throttle:knowledge-write')->block(15, 15)->name('knowledge.status');
    Route::post('/{table}/{id?}', [KnowledgeController::class, 'write'])->whereIn('table', ['van_ban', 'dieu_khoan', 'tu_khoa', 'quy_dinh'])->whereNumber('id')->middleware('throttle:knowledge-write')->block(15, 15)->name('knowledge.write');
    Route::delete('/{table}/{id}', [KnowledgeController::class, 'destroy'])->whereIn('table', ['van_ban', 'dieu_khoan', 'tu_khoa', 'quy_dinh'])->whereNumber('id')->middleware('throttle:knowledge-write')->block(15, 15)->name('knowledge.delete');
});

Route::prefix('api/admin/users')->middleware(['account.active', 'role.admin', 'can:quan_ly_phan_quyen'])->group(function () {
    Route::get('/', [AdminUserController::class, 'index'])->middleware('throttle:admin-users-read')->name('admin.users.index');
    Route::post('/{id?}', [AdminUserController::class, 'write'])->whereNumber('id')->middleware('throttle:admin-users-write')->block(15, 15)->name('admin.users.write');
    Route::post('/{id}/status', [AdminUserController::class, 'status'])->whereNumber('id')->middleware('throttle:admin-users-write')->block(15, 15)->name('admin.users.status');
    Route::delete('/{id}', [AdminUserController::class, 'destroy'])->whereNumber('id')->middleware('throttle:admin-users-write')->block(15, 15)->name('admin.users.delete');
});

Route::get('api/admin/permission-matrix', [PermissionMatrixController::class, 'index'])
    ->middleware(['account.active', 'role.admin', 'can:quan_ly_phan_quyen', 'throttle:admin-users-read'])
    ->name('admin.permission-matrix.index');

Route::get('/', function () {
    return view('welcome');
});
