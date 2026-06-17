<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DefectLinkController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MilestoneController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectSettingsController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReportExportController;
use App\Http\Controllers\RequirementController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\SuiteController;
use App\Http\Controllers\TestCaseController;
use App\Http\Controllers\TestPlanController;
use App\Http\Controllers\TestRunController;
use App\Http\Controllers\TodoController;
use App\Models\Section;
use App\Models\Suite;
use App\Models\TestCase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('projects/create', [ProjectController::class, 'create'])->name('projects.create');
    Route::resource('projects', ProjectController::class)
        ->only(['index', 'store', 'show', 'update', 'destroy']);

    Route::get('todo', [TodoController::class, 'globalIndex'])->name('todo.global');

    Route::get('reports', [ReportController::class, 'globalIndex'])->name('reports.global');
    Route::post('reports/cross-project', [ReportController::class, 'cross'])
        ->name('reports.cross');

    // Global dashboard export — must be before any wildcard report routes
    Route::get('reports/dashboard/export', [ReportExportController::class, 'exportDashboard'])
        ->name('reports.dashboard.export');

    // Per-project routes — specific routes BEFORE the {type} wildcard
    Route::get('projects/{project}/reports', [ReportController::class, 'index'])
        ->name('projects.reports.index');

    // Dashboard export — registered before {type} wildcard to avoid capture
    Route::get('projects/{project}/reports/dashboard/export', [ReportExportController::class, 'exportDashboard'])
        ->name('projects.reports.dashboard.export');

    // Per-report type export — also before the show wildcard
    Route::get('projects/{project}/reports/{type}/export', [ReportExportController::class, 'export'])
        ->name('projects.reports.export');

    // Wildcard show — last among report routes
    Route::get('projects/{project}/reports/{type}', [ReportController::class, 'show'])
        ->name('projects.reports.show');

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

    Route::get('suites/{suite}/export', [SuiteController::class, 'export'])->name('suites.export');

    Route::patch('cases/bulk', [TestCaseController::class, 'bulkUpdate'])->name('cases.bulkUpdate');
    Route::delete('cases/bulk', [TestCaseController::class, 'bulkDestroy'])->name('cases.bulkDestroy');
    Route::post('cases/bulk-assign', [TestCaseController::class, 'bulkAssign'])->name('cases.bulk-assign');

    // Global test case create — suite chosen via picker in the form
    Route::get('projects/{project}/cases/create', [TestCaseController::class, 'createGlobal'])
        ->name('projects.cases.create');

    Route::resource('suites.cases', TestCaseController::class)
        ->shallow()
        ->parameters(['cases' => 'testCase']);
    Route::post('cases/{testCase}/copy', [TestCaseController::class, 'copy'])->name('cases.copy');

    // Lightweight JSON endpoints used by dynamic form pickers
    Route::get('api/suites/{suite}/sections', function (Suite $suite) {
        return $suite->sections()->orderBy('display_order')->get(['id', 'name']);
    })->name('api.suites.sections');

    Route::get('api/suites/{suite}/sections-with-cases', function (Suite $suite) {
        $sections = $suite->sections()
            ->whereNull('parent_id')
            ->with([
                'testCases:id,title,section_id',
                'children:id,name,parent_id,suite_id',
                'children.testCases:id,title,section_id',
            ])
            ->orderBy('display_order')
            ->get(['id', 'name', 'suite_id', 'parent_id']);

        $mapCase = fn (TestCase $case): array => [
            'id' => $case->id,
            'title' => $case->title,
            'section_id' => $case->section_id,
        ];

        $mapSection = function (Section $section) use (&$mapSection, $mapCase): array {
            return [
                'id' => $section->id,
                'name' => $section->name,
                'suite_id' => $section->suite_id,
                'parent_id' => $section->parent_id,
                'test_cases' => $section->testCases->map($mapCase)->values(),
                'children' => $section->children->map($mapSection)->values(),
            ];
        };

        $tree = $sections->map($mapSection)->values();

        // Prepend a virtual section for unsectioned cases
        $unsectioned = $suite->testCases()->whereNull('section_id')->get(['id', 'title', 'section_id']);
        if ($unsectioned->isNotEmpty()) {
            $tree->prepend([
                'id' => 0,
                'name' => __('app.sections.default_name'),
                'suite_id' => $suite->id,
                'parent_id' => null,
                'test_cases' => $unsectioned->map($mapCase)->values(),
                'children' => [],
            ]);
        }

        return $tree;
    })->name('api.suites.sections-with-cases');

    // Defect lookup — live issue preview without persisting (used by DefectLinkInput)
    Route::get('api/integrations/{integration}/issues/{issueId}', [DefectLinkController::class, 'lookup'])
        ->name('api.defects.lookup')
        ->where('issueId', '[a-zA-Z0-9\-_]+');

    // Test Runs
    Route::resource('projects.runs', TestRunController::class)
        ->shallow()
        ->parameters(['runs' => 'testRun']);
    Route::patch('runs/{testRun}/close', [TestRunController::class, 'close'])->name('runs.close');
    Route::patch('runs/{testRun}/reopen', [TestRunController::class, 'reopen'])->name('runs.reopen');
    Route::post('runs/{testRun}/tests/{test}/results', [TestRunController::class, 'addResult'])
        ->name('runs.tests.results.store');
    Route::post('runs/{testRun}/bulk-results', [TestRunController::class, 'addResults'])
        ->name('runs.results.bulk');

    // Defect links — nested under results
    Route::post('results/{result}/defects', [DefectLinkController::class, 'store'])
        ->name('defects.store');
    Route::post('results/{result}/defects/create-in-tracker', [DefectLinkController::class, 'createInTracker'])
        ->name('defects.create-in-tracker');
    Route::delete('results/{result}/defects/{defect}', [DefectLinkController::class, 'destroy'])
        ->name('defects.destroy');
    Route::post('results/{result}/defects/{defect}/refresh', [DefectLinkController::class, 'refresh'])
        ->name('defects.refresh');

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
    Route::get('requirements', [RequirementController::class, 'globalIndex'])
        ->name('requirements.global');
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

    // Integrations
    Route::get('projects/{project}/integrations', [IntegrationController::class, 'index'])
        ->name('integrations.index');
    Route::post('projects/{project}/integrations', [IntegrationController::class, 'store'])
        ->name('integrations.store');
    Route::patch('projects/{project}/integrations/{integration}', [IntegrationController::class, 'update'])
        ->name('integrations.update');
    Route::delete('projects/{project}/integrations/{integration}', [IntegrationController::class, 'destroy'])
        ->name('integrations.destroy');
    Route::post('projects/{project}/integrations/{integration}/test', [IntegrationController::class, 'testConnection'])
        ->name('integrations.test');

    // To-Do
    Route::get('projects/{project}/todo', [TodoController::class, 'index'])->name('todo.index');

    // AI
    Route::get('projects/{project}/ai', [AiController::class, 'index'])->name('ai.index');

    // Administration
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('/', [AdminController::class, 'index'])->name('index');
        Route::get('/users', [AdminController::class, 'users'])->name('users');
        Route::patch('/users/{user}/role', [AdminController::class, 'updateRole'])->name('users.role');
        Route::delete('/users/{user}', [AdminController::class, 'deleteUser'])->name('users.delete');
        Route::get('/settings', [AdminController::class, 'settings'])->name('settings');
        Route::patch('/settings', [AdminController::class, 'updateSettings'])->name('settings.update');
    });
});

Route::post('/locale', [LocaleController::class, 'update'])
    ->name('locale.update');

require __DIR__.'/settings.php';
