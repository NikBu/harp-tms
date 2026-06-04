<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ProjectController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('projects/create', [ProjectController::class, 'create'])->name('projects.create');
    Route::resource('projects', ProjectController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy']);
});

Route::post('/locale', [LocaleController::class, 'update'])
    ->middleware('auth')
    ->name('locale.update');

require __DIR__.'/settings.php';
