<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestRun;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TodoController extends Controller
{
    /**
     * Statuses considered actionable for a personal to-do list.
     *
     * @var list<string>
     */
    private const OPEN_STATUSES = ['untested', 'failed', 'retest'];

    /**
     * Display the current user's outstanding tests in this project,
     * grouped by their test run.
     */
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $tests = Test::query()
            ->where('assigned_to', $request->user()->id)
            ->whereIn('status', self::OPEN_STATUSES)
            ->whereHas('run', fn ($q) => $q->where('project_id', $project->id))
            ->with([
                'run:id,name',
                'case:id,title,priority',
            ])
            ->orderBy('run_id')
            ->get();

        $groups = $tests
            ->groupBy('run_id')
            ->map(fn ($runTests) => [
                'run' => [
                    'id' => $runTests->first()->run_id,
                    'name' => optional($runTests->first()->run)->name ?? '—',
                ],
                'tests' => $runTests->map(fn (Test $test): array => [
                    'id' => $test->id,
                    'run_id' => $test->run_id,
                    'case_id' => $test->case_id,
                    'status' => $test->status,
                    'title' => optional($test->case)->title ?? '—',
                    'priority' => optional($test->case)->priority,
                ])->values(),
            ])
            ->values();

        return Inertia::render('todo/index', [
            'project' => $project->only(['id', 'name']),
            'todos' => $groups,
            'totalCount' => $tests->count(),
        ]);
    }

    /**
     * Display all entities assigned to the current user across every project
     * they can access, grouped by project.
     */
    public function globalIndex(Request $request): Response
    {
        $user = $request->user();

        $accessibleProjectIds = $user->hasRole('admin')
            ? Project::query()->pluck('id')
            : $user->projects()->pluck('projects.id');

        $cases = TestCase::query()
            ->where('assigned_to', $user->id)
            ->whereHas('suite', fn ($q) => $q->whereIn('project_id', $accessibleProjectIds))
            ->with(['suite:id,project_id,name', 'suite.project:id,name'])
            ->orderBy('title')
            ->get(['id', 'suite_id', 'title', 'priority', 'assigned_to']);

        $runs = TestRun::query()
            ->where('assigned_to', $user->id)
            ->whereIn('project_id', $accessibleProjectIds)
            ->with('project:id,name')
            ->orderBy('name')
            ->get(['id', 'project_id', 'name', 'is_completed']);

        /** @var array<int, array{project: array{id: int, name: string}, cases: list<array<string, mixed>>, runs: list<array<string, mixed>>, plans: list<array<string, mixed>>}> $grouped */
        $grouped = [];

        $ensureGroup = function (int $projectId, string $projectName) use (&$grouped): void {
            if (! isset($grouped[$projectId])) {
                $grouped[$projectId] = [
                    'project' => ['id' => $projectId, 'name' => $projectName],
                    'cases' => [],
                    'runs' => [],
                    'plans' => [],
                ];
            }
        };

        foreach ($cases as $case) {
            $project = $case->suite->project;
            $ensureGroup($project->id, $project->name);
            $grouped[$project->id]['cases'][] = [
                'id' => $case->id,
                'title' => $case->title,
                'priority' => $case->priority,
            ];
        }

        foreach ($runs as $run) {
            $ensureGroup($run->project->id, $run->project->name);
            $grouped[$run->project->id]['runs'][] = [
                'id' => $run->id,
                'name' => $run->name,
                'is_completed' => (bool) $run->is_completed,
            ];
        }

        $groups = collect($grouped)
            ->sortBy(fn ($group) => $group['project']['name'])
            ->values();

        $totalCount = $cases->count() + $runs->count();

        return Inertia::render('todo/global', [
            'groups' => $groups,
            'totalCount' => $totalCount,
        ]);
    }

    /**
     * Ensure the current user may access the given project.
     */
    private function authorizeProjectAccess(Request $request, Project $project): void
    {
        $user = $request->user();

        if ($user->hasRole('admin')) {
            return;
        }

        abort_unless(
            $project->members()->whereKey($user->getKey())->exists(),
            403
        );
    }
}
