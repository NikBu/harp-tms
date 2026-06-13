<?php

namespace App\Http\Controllers;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\TestCase;
use App\Models\TestRun;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the global dashboard for the current user.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->hasRole('admin');

        // Constrain queries to projects the user can access (admins see all).
        $accessibleIds = $isAdmin
            ? Project::query()->pluck('id')
            : $user->projects()->pluck('projects.id');

        $stats = [
            'projects' => $accessibleIds->count(),
            'test_cases' => TestCase::query()
                ->whereHas('suite', fn (Builder $q) => $q->whereIn('project_id', $accessibleIds))
                ->count(),
            'active_runs' => TestRun::query()
                ->whereIn('project_id', $accessibleIds)
                ->where('is_completed', false)
                ->count(),
            'milestones' => Milestone::query()
                ->whereIn('project_id', $accessibleIds)
                ->whereNull('parent_id')
                ->count(),
        ];

        $recentRuns = TestRun::query()
            ->whereIn('project_id', $accessibleIds)
            ->with('project:id,name')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn (TestRun $run): array => [
                'id' => $run->id,
                'name' => $run->name,
                'is_completed' => (bool) $run->is_completed,
                'created_at' => $run->created_at,
                'project' => $run->project?->only(['id', 'name']),
                'passed_count' => (int) $run->passed_count,
                'failed_count' => (int) $run->failed_count,
                'blocked_count' => (int) $run->blocked_count,
                'retest_count' => (int) $run->retest_count,
                'skipped_count' => (int) $run->skipped_count,
                'untested_count' => (int) $run->untested_count,
            ]);

        $myProjects = Project::query()
            ->whereIn('id', $accessibleIds)
            ->withCount(['testCases', 'testRuns'])
            ->orderByDesc('updated_at')
            ->limit(8)
            ->get()
            ->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'is_completed' => (bool) $project->is_completed,
                'test_cases_count' => (int) $project->test_cases_count,
                'test_runs_count' => (int) $project->test_runs_count,
            ]);

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'recentRuns' => $recentRuns,
            'myProjects' => $myProjects,
        ]);
    }
}
