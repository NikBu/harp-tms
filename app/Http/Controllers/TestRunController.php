<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestRun;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TestRunController extends Controller
{
    // -------------------------------------------------------------------------
    // Resource actions
    // -------------------------------------------------------------------------

    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $runs = $project->testRuns()
            ->with(['milestone:id,name', 'createdBy:id,name'])
            ->withCount('tests')
            ->latest()
            ->paginate(20);

        return Inertia::render('runs/index', [
            'project' => $project,
            'runs' => $runs,
        ]);
    }

    public function create(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        return Inertia::render('runs/create', [
            'project' => $project,
            'suites' => $project->suites()->orderBy('name')->get(['id', 'name']),
            'milestones' => $project->milestones()
                ->where('is_completed', false)
                ->orderBy('due_on')
                ->get(['id', 'name']),
            'members' => $project->members()->get(['users.id', 'users.name']),
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'refs' => ['nullable', 'string', 'max:255'],
            'suite_id' => ['nullable', 'integer', 'exists:suites,id'],
            'milestone_id' => ['nullable', 'integer', 'exists:milestones,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'include_all' => ['boolean'],
            'case_ids' => ['nullable', 'array'],
            'case_ids.*' => ['integer', 'exists:test_cases,id'],
        ]);

        $run = DB::transaction(function () use ($project, $validated): TestRun {
            $run = $project->testRuns()->create([
                'suite_id' => $validated['suite_id'] ?? null,
                'milestone_id' => $validated['milestone_id'] ?? null,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'refs' => $validated['refs'] ?? null,
                'include_all' => $validated['include_all'] ?? false,
                'assigned_to' => $validated['assigned_to'] ?? null,
                'created_by' => Auth::id(),
            ]);

            // Determine which test cases to include
            if ($run->include_all && $run->suite_id) {
                $caseIds = TestCase::where('suite_id', $run->suite_id)
                    ->whereNull('deleted_at')
                    ->pluck('id');
            } elseif (! empty($validated['case_ids'])) {
                $caseIds = collect($validated['case_ids']);
            } else {
                $caseIds = collect();
            }

            foreach ($caseIds as $caseId) {
                $run->tests()->create([
                    'case_id' => $caseId,
                    'status' => 'untested',
                ]);
            }

            $run->update(['untested_count' => $caseIds->count()]);

            return $run;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.runs.created')]);

        return to_route('runs.show', $run);
    }

    public function show(Request $request, TestRun $testRun): Response
    {
        $this->authorizeProjectAccess($request, $testRun->project);

        $testRun->load([
            'project',
            'milestone:id,name',
            'suite:id,name',
            'createdBy:id,name',
            'tests' => function ($q) {
                $q->with([
                    'case:id,title,template,priority,section_id',
                    'case.section:id,name',
                    'latestResult:id,test_id,status,comment,created_by,created_at',
                    'latestResult.createdBy:id,name',
                ])->orderBy('id');
            },
        ]);

        return Inertia::render('runs/show', [
            'run' => $testRun,
            'statuses' => Test::STATUSES,
        ]);
    }

    public function destroy(Request $request, TestRun $testRun): RedirectResponse
    {
        $project = $testRun->project;
        $user = $request->user();

        $isProjectAdmin = $project->members()
            ->whereKey($user->getKey())
            ->wherePivot('role', 'project_admin')
            ->exists();

        abort_unless($isProjectAdmin || $user->hasRole('admin'), 403);

        $projectId = $project->id;

        $testRun->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.runs.deleted')]);

        return to_route('projects.runs.index', $projectId);
    }

    // -------------------------------------------------------------------------
    // Custom actions
    // -------------------------------------------------------------------------

    /**
     * Mark the run as completed.
     */
    public function close(Request $request, TestRun $testRun): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $testRun->project);

        abort_if($testRun->is_completed, 422, 'Run is already closed.');

        $testRun->update([
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.runs.closed')]);

        return back();
    }

    /**
     * Reopen a completed run.
     */
    public function reopen(Request $request, TestRun $testRun): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $testRun->project);

        abort_unless($testRun->is_completed, 422, 'Run is not closed.');

        $testRun->update([
            'is_completed' => false,
            'completed_at' => null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.runs.reopened')]);

        return back();
    }

    /**
     * Submit a result for a single test within this run.
     * This is the core "execute test" action.
     */
    public function addResult(Request $request, TestRun $testRun, Test $test): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $testRun->project);

        abort_if($testRun->is_completed, 422, __('app.runs.closed_error'));
        abort_unless($test->run_id === $testRun->id, 404);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', Test::STATUSES)],
            'comment' => ['nullable', 'string'],
            'elapsed' => ['nullable', 'string', 'max:50'],
            'version' => ['nullable', 'string', 'max:100'],
        ]);

        $elapsedSeconds = $this->parseElapsed($validated['elapsed'] ?? null);

        DB::transaction(function () use ($test, $testRun, $validated, $elapsedSeconds): void {
            $previousStatus = $test->status;
            $newStatus = $validated['status'];

            // Append immutable result entry
            $test->results()->create([
                'run_id' => $testRun->id,
                'case_id' => $test->case_id,
                'status' => $newStatus,
                'comment' => $validated['comment'] ?? null,
                'elapsed' => $elapsedSeconds,
                'version' => $validated['version'] ?? null,
                'created_by' => Auth::id(),
            ]);

            // Update rolled-up status on the test row
            $test->update(['status' => $newStatus]);

            // Recalculate run counters
            $this->recalculateRunCounts($testRun);
        });

        return back();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Recalculate the denormalized status counters on the run.
     */
    private function recalculateRunCounts(TestRun $testRun): void
    {
        $counts = $testRun->tests()
            ->selectRaw('status, COUNT(*) as cnt')
            ->groupBy('status')
            ->pluck('cnt', 'status');

        $testRun->update([
            'passed_count' => $counts['passed'] ?? 0,
            'failed_count' => $counts['failed'] ?? 0,
            'blocked_count' => $counts['blocked'] ?? 0,
            'untested_count' => $counts['untested'] ?? 0,
            'retest_count' => $counts['retest'] ?? 0,
            'skipped_count' => $counts['skipped'] ?? 0,
        ]);
    }

    /**
     * Parse "1h 30m" style strings into seconds, same logic as TestCaseController.
     */
    private function parseElapsed(?string $value): ?int
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        if (ctype_digit(trim($value))) {
            return (int) $value;
        }

        $seconds = 0;
        $matched = false;

        if (preg_match('/(\d+)\s*h/i', $value, $m)) {
            $seconds += (int) $m[1] * 3600;
            $matched = true;
        }

        if (preg_match('/(\d+)\s*m/i', $value, $m)) {
            $seconds += (int) $m[1] * 60;
            $matched = true;
        }

        return $matched ? $seconds : null;
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
