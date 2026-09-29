<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\RegistrationController;
use Illuminate\Support\Facades\Route;

// Deliberately in the web group: every request has encrypted cookies, server session and CSRF.
Route::prefix('api/auth')->group(function () {
    Route::post('password/request', [PasswordResetController::class, 'send'])->middleware('throttle:reset-send')->block(15, 15)->name('auth.reset.request');
    Route::post('password/verify', [PasswordResetController::class, 'verify'])->middleware('throttle:reset-action')->block(15, 15)->name('auth.reset.verify');
    Route::post('password/complete', [PasswordResetController::class, 'complete'])->middleware('throttle:reset-action')->block(15, 15)->name('auth.reset.complete');
    Route::post('register', [RegistrationController::class, 'store'])->middleware('throttle:registration')->name('auth.register');
    Route::get('csrf', [AuthController::class, 'csrf'])->middleware('throttle:120,1')->name('auth.csrf');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login');
    Route::get('me', [AuthController::class, 'me'])->middleware('account.active')->name('auth.me');
    Route::post('logout', [AuthController::class, 'logout'])->name('auth.logout');
});

Route::get('/', function () {
    return view('welcome');
});
