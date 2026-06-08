<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MilestoneController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectSettingsController;
use App\Http\Controllers\RequirementController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\SuiteController;
use App\Http\Controllers\TestCaseController;
use App\Http\Controllers\TestPlanController;
use App\Http\Controllers\TestRunController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('projects/create', [ProjectController::class, 'create'])->name('projects.create');
    Route::resource('projects', ProjectController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy']);

    // Project Settings (separate controller, scoped under a project)
    Route::get('projects/{project}/settings', [ProjectSettingsController::class, 'show'])
        ->name('projects.settings');
    Route::patch('projects/{project}/settings/general', [ProjectSettingsController::class, 'updateGeneral'])
        ->name('projects.settings.general');
    Route::patch('projects/{project}/settings/members', [ProjectSettingsController::class, 'addMember'])
        ->name('projects.settings.members.add');
    Route::patch('projects/{project}/settings/members/{user}/role', [ProjectSettingsController::class, 'updateMemberRole'])
        ->name('projects.settings.members.role');
    Route::delete('projects/{project}/settings/members/{user}', [ProjectSettingsController::class, 'removeMember'])
        ->name('projects.settings.members.remove');

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

    // Test Runs
    Route::resource('projects.runs', TestRunController::class)
        ->shallow()
        ->parameters(['runs' => 'testRun']);
    Route::patch('runs/{testRun}/close', [TestRunController::class, 'close'])->name('runs.close');
    Route::patch('runs/{testRun}/reopen', [TestRunController::class, 'reopen'])->name('runs.reopen');
    Route::post('runs/{testRun}/tests/{test}/results', [TestRunController::class, 'addResult'])
        ->name('runs.tests.results.store');

    // Milestones
    Route::resource('projects.milestones', MilestoneController::class)
        ->shallow()
        ->parameters(['milestones' => 'milestone']);
    Route::patch('milestones/{milestone}/complete', [MilestoneController::class, 'complete'])
        ->name('milestones.complete');
    Route::patch('milestones/{milestone}/reopen', [MilestoneController::class, 'reopen'])
        ->name('milestones.reopen');

    // Test Plans
    Route::resource('projects.plans', TestPlanController::class)
        ->shallow()
        ->parameters(['plans' => 'testPlan']);
    Route::patch('plans/{testPlan}/close', [TestPlanController::class, 'close'])->name('plans.close');
    Route::patch('plans/{testPlan}/reopen', [TestPlanController::class, 'reopen'])->name('plans.reopen');
    Route::post('plans/{testPlan}/entries', [TestPlanController::class, 'addEntry'])
        ->name('plans.entries.store');
    Route::delete('plans/{testPlan}/entries/{entry}', [TestPlanController::class, 'removeEntry'])
        ->name('plans.entries.destroy');

    // Requirements
    Route::get('projects/{project}/requirements/create', [RequirementController::class, 'create'])
        ->name('requirements.create');
    Route::resource('projects.requirements', RequirementController::class)
        ->shallow()
        ->parameters(['requirements' => 'requirement'])
        ->except(['create']);
    Route::post('/requirements/{requirement}/test-cases', [RequirementController::class, 'linkTestCases'])
        ->name('requirements.test-cases.link');
    Route::delete('/requirements/{requirement}/test-cases/{testCase}', [RequirementController::class, 'unlinkTestCase'])
        ->name('requirements.test-cases.unlink');
});

Route::post('/locale', [LocaleController::class, 'update'])
    ->middleware('auth')
    ->name('locale.update');

require __DIR__.'/settings.php';
