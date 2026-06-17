<?php

namespace App\Http\Controllers;

use App\Models\Integration;
use App\Models\Project;
use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestRun;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
            ->with(['milestone:id,name', 'createdBy:id,name', 'suite:id,name'])
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
            'currentUserId' => Auth::id(),
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
            'start_on' => ['nullable', 'date'],
            'end_on' => ['nullable', 'date', 'after_or_equal:start_on'],
            'include_all' => ['boolean'],
            'case_ids' => ['nullable', 'array'],
            'case_ids.*' => ['integer', 'exists:test_cases,id'],
            'filter_priority' => ['nullable', 'string'],
            'filter_type' => ['nullable', 'string'],
        ]);

        $run = DB::transaction(function () use ($project, $validated): TestRun {
            $run = $project->testRuns()->create([
                'suite_id'    => $validated['suite_id'] ?? null,
                'milestone_id' => $validated['milestone_id'] ?? null,
                'name'         => $validated['name'],
                'description'  => $validated['description'] ?? null,
                'refs'         => $validated['refs'] ?? null,
                'include_all'  => $validated['include_all'] ?? false,
                'assigned_to'  => $validated['assigned_to'] ?? null,
                'created_by'   => Auth::id(),
                ...(Schema::hasColumn('test_runs', 'start_on') ? [
                    'start_on' => $validated['start_on'] ?? null,
                    'end_on'   => $validated['end_on'] ?? null,
                ] : []),
            ]);

            if ($run->include_all && $run->suite_id) {
                $query = TestCase::where('suite_id', $run->suite_id)
                    ->whereNull('deleted_at');

                if (! empty($validated['filter_priority'])) {
                    $query->where('priority', $validated['filter_priority']);
                }

                if (! empty($validated['filter_type'])) {
                    $query->where('case_type', $validated['filter_type']);
                }

                $caseIds = $query->pluck('id');
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

        if ($request->boolean('add_and_create')) {
            Inertia::flash('toast', ['type' => 'success', 'message' => __('app.runs.created')]);

            return to_route('projects.runs.create', $project);
        }

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
                    'latestResult:id,status,comment,elapsed,version,defect_url,created_by,created_at',
                    'latestResult.createdBy:id,name',
                    'latestResult.defectLinks',
                ])->orderBy('id');
            },
        ]);

        $integrations = Integration::where('project_id', $testRun->project_id)
            ->where('is_active', true)
            ->get(['id', 'integration_type as provider', 'name']);

        return Inertia::render('runs/show', [
            'run' => $testRun,
            'statuses' => Test::STATUSES,
            'integrations' => $integrations,
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
            'defect_url' => ['nullable', 'url', 'max:2048'],
        ]);

        $elapsedSeconds = $this->parseElapsed($validated['elapsed'] ?? null);

        DB::transaction(function () use ($test, $testRun, $validated, $elapsedSeconds): void {
            $test->results()->create([
                'run_id' => $testRun->id,
                'case_id' => $test->case_id,
                'status' => $validated['status'],
                'comment' => $validated['comment'] ?? null,
                'elapsed' => $elapsedSeconds,
                'version' => $validated['version'] ?? null,
                'defect_url' => $validated['defect_url'] ?? null,
                'created_by' => Auth::id(),
            ]);

            $test->update(['status' => $validated['status']]);
            $this->recalculateRunCounts($testRun);
        });

        return back();
    }

    /**
     * Submit results for multiple tests in one request.
     * Payload: { results: [ { test_id, status, comment?, elapsed?, version?, defect_url? } ] }
     */
    public function addResults(Request $request, TestRun $testRun): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $testRun->project);

        abort_if($testRun->is_completed, 422, __('app.runs.closed_error'));

        $validated = $request->validate([
            'results' => ['required', 'array', 'min:1', 'max:500'],
            'results.*.test_id' => ['required', 'integer', 'exists:tests,id'],
            'results.*.status' => ['required', 'string', 'in:'.implode(',', Test::STATUSES)],
            'results.*.comment' => ['nullable', 'string'],
            'results.*.elapsed' => ['nullable', 'string', 'max:50'],
            'results.*.version' => ['nullable', 'string', 'max:100'],
            'results.*.defect_url' => ['nullable', 'url', 'max:2048'],
        ]);

        // Pre-load all referenced tests and verify they belong to this run
        $testIds = collect($validated['results'])->pluck('test_id')->unique();
        $testsMap = Test::whereIn('id', $testIds)
            ->where('run_id', $testRun->id)
            ->get()
            ->keyBy('id');

        // Reject if any test_id doesn't belong to this run
        $foreignIds = $testIds->diff($testsMap->keys());
        abort_unless($foreignIds->isEmpty(), 422, 'Some test IDs do not belong to this run.');

        DB::transaction(function () use ($validated, $testRun, $testsMap): void {
            foreach ($validated['results'] as $item) {
                $test = $testsMap[$item['test_id']];
                $elapsed = $this->parseElapsed($item['elapsed'] ?? null);

                $test->results()->create([
                    'run_id' => $testRun->id,
                    'case_id' => $test->case_id,
                    'status' => $item['status'],
                    'comment' => $item['comment'] ?? null,
                    'elapsed' => $elapsed,
                    'version' => $item['version'] ?? null,
                    'defect_url' => $item['defect_url'] ?? null,
                    'created_by' => Auth::id(),
                ]);

                $test->update(['status' => $item['status']]);
            }

            $this->recalculateRunCounts($testRun);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.runs.bulk_results_saved')]);

        return back();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

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
     * Submit the same result for multiple tests at once.
     */
    public function bulkResults(Request $request, TestRun $testRun): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $testRun->project);

        abort_if($testRun->is_completed, 422, __('app.runs.closed_error'));

        $request->validate([
            'results' => ['required', 'string'], // JSON-encoded on the frontend
        ]);

        $items = json_decode($request->input('results'), true);

        abort_if(! is_array($items) || empty($items), 422, 'Invalid results payload.');

        DB::transaction(function () use ($testRun, $items): void {
            foreach ($items as $item) {
                // Minimal per-item validation
                $testId = filter_var($item['test_id'] ?? null, FILTER_VALIDATE_INT);
                $status = $item['status'] ?? null;

                if (! $testId || ! in_array($status, Test::STATUSES, true)) {
                    continue;
                }

                $test = $testRun->tests()->find($testId);
                if (! $test) {
                    continue;
                }

                $test->results()->create([
                    'run_id' => $testRun->id,
                    'case_id' => $test->case_id,
                    'status' => $status,
                    'comment' => $item['comment'] ?? null,
                    'version' => $item['version'] ?? null,
                    'created_by' => Auth::id(),
                ]);

                $test->update(['status' => $status]);
            }

            $this->recalculateRunCounts($testRun);
        });

        return back();
    }

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
