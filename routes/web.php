<?php

use Illuminate\Support\Facades\Route;
use app\Http\Controllers\LocaleController;
Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::post('/locale', [LocaleController::class, 'update'])
    ->middleware('auth')
    ->name('locale.update');

require __DIR__.'/settings.php';
