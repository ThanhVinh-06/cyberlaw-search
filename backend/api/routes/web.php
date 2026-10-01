<?php

use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\KnowledgeController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\PermissionMatrixController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\AdminStatisticsController;
use App\Services\PublicKnowledgeSearch;
use App\Http\Controllers\PublicLibraryController;
use App\Http\Controllers\PublicTermsController;
use App\Http\Controllers\HistoryController;
use App\Services\LocalAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Deliberately in the web group: every request has encrypted cookies, server session and CSRF.
Route::post('api/answer', fn (Request $request, LocalAnswer $answer) => response()->json($answer->answer($request)))
    ->middleware(['account.active', 'can:chat_ai_cyberlaw', 'throttle:ai-answer'])->block(20, 20)->name('ai.answer');
Route::prefix('api/history')->middleware(['account.active', 'can:xem_lich_su_chat'])->group(function () {
    Route::get('/', [HistoryController::class, 'index'])->middleware('throttle:history-read')->name('history.index');
    Route::get('/{id}', [HistoryController::class, 'show'])->where('id', '[1-9][0-9]{0,17}')->middleware('throttle:history-read')->name('history.show');
    Route::delete('/{id}', [HistoryController::class, 'destroy'])->where('id', '[1-9][0-9]{0,17}')->middleware('throttle:history-write')->block(15, 15)->name('history.destroy');
});
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
Route::get('api/admin/statistics', [AdminStatisticsController::class, 'overview'])
    ->middleware(['account.active', 'role.admin', 'can:quan_ly_van_ban', 'throttle:knowledge-read'])
    ->name('admin.statistics.overview');

Route::get('api/search', fn (Request $request, PublicKnowledgeSearch $search) => response()->json($search->search($request)))
    ->middleware('throttle:public-search')->name('public.search');
Route::get('api/search/{id}', fn (int $id, PublicKnowledgeSearch $search) => response()->json($search->detail($id)))
    ->where('id', '[1-9][0-9]{0,17}')->middleware('throttle:public-search')->name('public.search.detail');

Route::get('api/library', [PublicLibraryController::class, 'index'])
    ->middleware('throttle:public-search')->name('public.library');
Route::get('api/terms', [PublicTermsController::class, 'index'])
    ->middleware('throttle:public-search')->name('public.terms');
Route::get('api/library/articles/{number}', [PublicLibraryController::class, 'article'])
    ->where('number', '[1-9][0-9]{0,2}[a-z]?')->middleware('throttle:public-search')->name('public.library.article');
Route::get('api/library/pdf', [PublicLibraryController::class, 'pdf'])
    ->middleware('throttle:public-search')->name('public.library.pdf');

Route::get('/', function () {
    return view('welcome');
});
