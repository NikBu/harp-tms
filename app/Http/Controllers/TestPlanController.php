<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\TestCase;
use App\Models\TestPlan;
use App\Models\TestPlanEntry;
use App\Models\TestRun;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class TestPlanController extends Controller
{
    public function index(Request $request, Project $project): Response
    {
        Gate::authorize('view', $project);

        $plans = $project->testPlans()
            ->with(['milestone:id,name'])
            ->withCount('entries')
            ->latest()
            ->paginate(20);

        return Inertia::render('plans/index', [
            'project' => $project,
            'plans'   => $plans,
        ]);
    }

    public function create(Request $request, Project $project): Response
    {
        Gate::authorize('manageRuns', $project);

        return Inertia::render('plans/form', [
            'project'    => $project,
            'plan'       => null,
            'milestones' => $project->milestones()->where('is_completed', false)->orderBy('due_on')->get(['id', 'name']),
            'suites'     => $project->suites()->orderBy('name')->get(['id', 'name']),
            'members'    => $project->members()->get(['users.id', 'users.name']),
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        Gate::authorize('manageRuns', $project);

        $validated = $this->validatePlan($request);

        $entries = $request->validate([
            'entries'                   => ['nullable', 'array'],
            'entries.*.suite_id'        => ['required', 'integer', 'exists:suites,id'],
            'entries.*.include_all'     => ['boolean'],
            'entries.*.assigned_to'     => ['nullable', 'integer', 'exists:users,id'],
            'entries.*.refs'            => ['nullable', 'string', 'max:255'],
            'entries.*.description'     => ['nullable', 'string'],
            'entries.*.start_on'        => ['nullable', 'date'],
            'entries.*.end_on'          => ['nullable', 'date'],
            'entries.*.case_ids'        => ['nullable', 'array'],
            'entries.*.case_ids.*'      => ['integer', 'exists:test_cases,id'],
        ])['entries'] ?? [];

        $plan = DB::transaction(function () use ($project, $validated, $entries): TestPlan {
            $plan = $project->testPlans()->create([
                ...$validated,
                'created_by' => Auth::id(),
            ]);

            foreach ($entries as $entry) {
                $includeAll = $entry['include_all'] ?? true;

                $run = $project->testRuns()->create([
                    'suite_id'    => $entry['suite_id'],
                    'plan_id'     => $plan->id,
                    'name'        => $plan->name,
                    'description' => $entry['description'] ?? null,
                    'refs'        => $entry['refs'] ?? null,
                    'include_all' => $includeAll,
                    'assigned_to' => $entry['assigned_to'] ?? null,
                    'created_by'  => Auth::id(),
                    ...(Schema::hasColumn('test_runs', 'start_on') ? [
                        'start_on' => $entry['start_on'] ?? null,
                        'end_on'   => $entry['end_on']   ?? null,
                    ] : []),
                ]);

                $plan->entries()->create([
                    'run_id'      => $run->id,
                    'assigned_to' => $entry['assigned_to'] ?? null,
                ]);

                $caseIds = $includeAll
                    ? TestCase::where('suite_id', $entry['suite_id'])->whereNull('deleted_at')->pluck('id')
                    : collect($entry['case_ids'] ?? []);

                foreach ($caseIds as $caseId) {
                    $run->tests()->create(['case_id' => $caseId, 'status' => 'untested']);
                }

                $run->update(['untested_count' => $caseIds->count()]);
            }

            return $plan;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('plans.created')]);
        return to_route('plans.show', $plan);
    }

    public function show(Request $request, TestPlan $testPlan): Response
    {
        Gate::authorize('view', $testPlan->project);

        $testPlan->load([
            'project',
            'milestone:id,name',
            'createdBy:id,name',
            'entries' => function ($q) {
                $q->with([
                    'run' => function ($r) {
                        $r->select(
                            'id', 'name', 'is_completed', 'suite_id',
                            'passed_count', 'failed_count', 'blocked_count',
                            'untested_count', 'retest_count', 'skipped_count'
                        );
                    },
                    'assignedTo:id,name',
                    'configurations:id,name',
                ]);
            },
        ]);

        $attachedRunIds = $testPlan->entries->pluck('run_id');
        $availableRuns  = $testPlan->project->testRuns()
            ->whereNotIn('id', $attachedRunIds)
            ->where('is_completed', false)
            ->orderBy('name')
            ->get(['id', 'name']);

        $configGroups = $testPlan->project->configurationGroups()
            ->with('configurations:id,group_id,name')
            ->get(['id', 'name']);

        return Inertia::render('plans/show', [
            'plan'          => $testPlan,
            'availableRuns' => $availableRuns,
            'configGroups'  => $configGroups,
            'members'       => $testPlan->project->members()->get(['users.id', 'users.name']),
        ]);
    }

    public function edit(Request $request, TestPlan $testPlan): Response
    {
        Gate::authorize('manageRuns', $testPlan->project);

        return Inertia::render('plans/form', [
            'project'    => $testPlan->project,
            'plan'       => $testPlan,
            'milestones' => $testPlan->project->milestones()->where('is_completed', false)->orderBy('due_on')->get(['id', 'name']),
            'suites'     => $testPlan->project->suites()->orderBy('name')->get(['id', 'name']),
            'members'    => $testPlan->project->members()->get(['users.id', 'users.name']),
        ]);
    }

    public function update(Request $request, TestPlan $testPlan): RedirectResponse
    {
        Gate::authorize('manageRuns', $testPlan->project);

        $testPlan->update($this->validatePlan($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('plans.updated')]);
        return to_route('plans.show', $testPlan);
    }

    public function destroy(Request $request, TestPlan $testPlan): RedirectResponse
    {
        Gate::authorize('delete', $testPlan->project);

        $projectId = $testPlan->project_id;
        $testPlan->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('plans.deleted')]);
        return to_route('projects.plans.index', $projectId);
    }

    public function close(Request $request, TestPlan $testPlan): RedirectResponse
    {
        Gate::authorize('manageRuns', $testPlan->project);
        abort_if($testPlan->is_completed, 422, 'Plan is already closed.');

        $testPlan->update(['is_completed' => true, 'completed_at' => now()]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('plans.closed')]);
        return back();
    }

    public function reopen(Request $request, TestPlan $testPlan): RedirectResponse
    {
        Gate::authorize('manageRuns', $testPlan->project);
        abort_unless($testPlan->is_completed, 422, 'Plan is not closed.');

        $testPlan->update(['is_completed' => false, 'completed_at' => null]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('plans.reopened')]);
        return back();
    }

    public function addEntry(Request $request, TestPlan $testPlan): RedirectResponse
    {
        Gate::authorize('manageRuns', $testPlan->project);
        abort_if($testPlan->is_completed, 422, __('plans.closed_error'));

        $validated = $request->validate([
            'run_id'              => ['required', 'integer', 'exists:test_runs,id'],
            'assigned_to'         => ['nullable', 'integer', 'exists:users,id'],
            'configuration_ids'   => ['nullable', 'array'],
            'configuration_ids.*' => ['integer', 'exists:configurations,id'],
        ]);

        abort_if(
            $testPlan->entries()->where('run_id', $validated['run_id'])->exists(),
            422,
            __('plans.entry_duplicate')
        );

        $run = TestRun::findOrFail($validated['run_id']);
        abort_unless($run->project_id === $testPlan->project_id, 422, __('plans.entry_wrong_project'));

        DB::transaction(function () use ($testPlan, $validated, $run): void {
            $entry = $testPlan->entries()->create([
                'run_id'      => $validated['run_id'],
                'assigned_to' => $validated['assigned_to'] ?? null,
            ]);

            $run->update(['plan_id' => $testPlan->id]);

            if (! empty($validated['configuration_ids'])) {
                $entry->configurations()->sync($validated['configuration_ids']);
            }
        });

        return back();
    }

    public function removeEntry(Request $request, TestPlan $testPlan, TestPlanEntry $entry): RedirectResponse
    {
        Gate::authorize('manageRuns', $testPlan->project);
        abort_unless($entry->plan_id === $testPlan->id, 404);

        DB::transaction(function () use ($entry): void {
            TestRun::where('id', $entry->run_id)->update(['plan_id' => null]);
            $entry->delete();
        });

        return back();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function validatePlan(Request $request): array
    {
        return $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'refs'         => ['nullable', 'string', 'max:255'],
            'milestone_id' => ['nullable', 'integer', 'exists:milestones,id'],
            'start_on'     => ['nullable', 'date'],
            'end_on'       => ['nullable', 'date', 'after_or_equal:start_on'],
        ]);
    }
}
