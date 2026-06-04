<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\SuiteController;
use App\Http\Controllers\TestCaseController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('projects/create', [ProjectController::class, 'create'])->name('projects.create');
    Route::resource('projects', ProjectController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy']);

    Route::resource('projects.suites', SuiteController::class)->shallow();
    Route::resource('projects.suites.sections', SectionController::class)
        ->shallow()
        ->only(['store', 'update', 'destroy']);
    Route::post('projects/{project}/suites/{suite}/sections/reorder', [SectionController::class, 'reorder'])
        ->name('sections.reorder');

    Route::resource('suites.cases', TestCaseController::class)
        ->shallow()
        ->parameters(['cases' => 'testCase']);
    Route::post('cases/{testCase}/copy', [TestCaseController::class, 'copy'])->name('cases.copy');
});

Route::post('/locale', [LocaleController::class, 'update'])
    ->middleware('auth')
    ->name('locale.update');

require __DIR__.'/settings.php';
