<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Test;
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
