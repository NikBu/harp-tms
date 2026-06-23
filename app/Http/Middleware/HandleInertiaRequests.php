<?php

namespace App\Http\Middleware;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\Suite;
use App\Models\TestCase;
use App\Models\TestPlan;
use App\Models\TestRun;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user()
                    ? array_merge($request->user()->toArray(), [
                        // Spatie roles as a flat string array — e.g. ['admin'] or ['project_admin']
                        'roles' => $request->user()->getRoleNames()->toArray(),
                    ])
                    : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state')
                || $request->cookie('sidebar_state') === 'true',
            'locale' => app()->getLocale(),
            'translations' => $this->loadTranslations(),

            // Current project context — injected when URL matches /projects/{id}/*
            // or when a shallow resource route carries a suite/case/run/milestone param
            // whose model belongs to a project.
            'currentProject' => $this->resolveCurrentProject($request),

            // Project switcher list — only the projects the user can access
            'accessibleProjects' => $this->resolveAccessibleProjects($request),

            // To-do count for the current project (tests assigned to user)
            'todoCount' => $this->resolveTodoCount($request),
        ];
    }

    // ──────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────

    private function resolveCurrentProject(Request $request): ?array
    {
        if (! $request->user()) {
            return null;
        }

        $project = $this->findProjectFromRoute($request);

        if (! $project) {
            return null;
        }

        $user = $request->user();
        if (! $user->hasRole('admin') && ! $project->members()->where('user_id', $user->id)->exists()) {
            return null;
        }

        return [
            'id' => $project->id,
            'name' => $project->name,
            'suite_mode' => $project->suite_mode,
        ];
    }

    /**
     * Try every possible way to arrive at a Project model from the current route,
     * in order of specificity:
     *
     *  1. Route model binding already resolved a `project` parameter.
     *  2. URL path contains /projects/{id}/ (non-shallow project-scoped routes).
     *  3. Route has a `suite` parameter   → load suite → project.
     *  4. Route has a `testCase` parameter → load case  → suite → project.
     *  5. Route has a `testRun` parameter  → load run   → project.
     *  6. Route has a `milestone` parameter → load milestone → project.
     *  7. Route has a `testPlan` parameter  → load plan  → project.
     */
    private function findProjectFromRoute(Request $request): ?Project
    {
        // 1 — direct project route param (already resolved by Laravel)
        $routeProject = $request->route('project');
        if ($routeProject instanceof Project) {
            return $routeProject;
        }
        if ($routeProject) {
            return Project::find((int) $routeProject);
        }

        // 2 — /projects/{id}/* URL pattern
        if (preg_match('#/projects/(\d+)#', $request->path(), $m)) {
            return Project::find((int) $m[1]);
        }

        // 3 — shallow suite route: /suites/{suite}
        $suite = $request->route('suite');
        if ($suite instanceof Suite) {
            return $suite->project;
        }
        if ($suite) {
            $s = Suite::find((int) $suite);

            return $s?->project;
        }

        // 4 — shallow test-case route: /cases/{testCase} or /suites/{suite}/cases/{testCase}
        $testCase = $request->route('testCase');
        if ($testCase) {
            $tc = $testCase instanceof TestCase
                ? $testCase
                : TestCase::find((int) $testCase);

            return $tc?->suite?->project;
        }

        // 5 — shallow test-run route: /runs/{testRun}
        $testRun = $request->route('testRun');
        if ($testRun) {
            $run = $testRun instanceof TestRun
                ? $testRun
                : TestRun::find((int) $testRun);

            return $run?->project;
        }

        // 6 — shallow milestone route: /milestones/{milestone}
        $milestone = $request->route('milestone');
        if ($milestone) {
            $ms = $milestone instanceof Milestone
                ? $milestone
                : Milestone::find((int) $milestone);

            return $ms?->project;
        }

        // 7 — shallow test-plan route: /plans/{testPlan}
        $testPlan = $request->route('testPlan');
        if ($testPlan) {
            $plan = $testPlan instanceof TestPlan
                ? $testPlan
                : TestPlan::find((int) $testPlan);

            return $plan?->project;
        }

        return null;
    }

    private function resolveAccessibleProjects(Request $request): array
    {
        if (! $request->user()) {
            return [];
        }

        $user = $request->user();

        $query = Project::select(['id', 'name', 'suite_mode'])
            ->whereNull('completed_at')
            ->orderBy('name');

        if (! $user->hasRole('admin')) {
            $query->whereHas('members', fn ($q) => $q->where('user_id', $user->id));
        }

        return $query->limit(50)->get()->toArray();
    }

    private function resolveTodoCount(Request $request): int
    {
        // Placeholder — wire to actual test assignments when that model exists
        return 0;
    }

    private function loadTranslations(): array
    {
        $locale = app()->getLocale();
        $path = lang_path($locale);

        if (! is_dir($path)) {
            return [];
        }

        $translations = [];
        foreach (glob("{$path}/*.php") as $file) {
            $key = basename($file, '.php');
            $translations[$key] = require $file;
        }

        return $translations;
    }
}
