<?php

namespace App\Http\Controllers;

use App\Models\Milestone;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MilestoneController extends Controller
{
    public function index(Request $request, Project $project): Response
    {
        Gate::authorize('view', $project);

        $milestones = $project->milestones()
            ->with(['children:id,parent_id,name,status,due_on,is_completed'])
            ->whereNull('parent_id')
            ->withCount(['testRuns', 'testPlans'])
            ->orderBy('due_on')
            ->orderBy('name')
            ->get();

        return Inertia::render('milestones/index', [
            'project' => $project,
            'milestones' => $milestones,
            'statuses' => Milestone::STATUSES,
        ]);
    }

    public function create(Request $request, Project $project): Response
    {
        Gate::authorize('edit', $project);

        $parents = $project->milestones()
            ->whereNull('parent_id')
            ->where('is_completed', false)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('milestones/form', [
            'project' => $project,
            'parents' => $parents,
            'statuses' => Milestone::STATUSES,
            'milestone' => null,
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        Gate::authorize('edit', $project);

        $validated = $this->validateMilestone($request);

        $milestone = $project->milestones()->create([
            ...$validated,
            'created_by' => Auth::id(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('milestones.created')]);

        return to_route('milestones.show', $milestone);
    }

    public function show(Request $request, Milestone $milestone): Response
    {
        Gate::authorize('view', $milestone->project);

        $milestone->load([
            'project',
            'parent:id,name',
            'children' => fn ($q) => $q->withCount(['testRuns', 'testPlans']),
            'createdBy:id,name',
            'testRuns' => fn ($q) => $q->select(
                'id', 'milestone_id', 'name', 'is_completed',
                'passed_count', 'failed_count', 'blocked_count',
                'untested_count', 'retest_count', 'skipped_count'
            )->latest()->limit(20),
        ]);

        return Inertia::render('milestones/show', [
            'milestone' => $milestone,
            'statuses' => Milestone::STATUSES,
        ]);
    }

    public function edit(Request $request, Milestone $milestone): Response
    {
        Gate::authorize('edit', $milestone->project);

        $parents = $milestone->project->milestones()
            ->whereNull('parent_id')
            ->where('is_completed', false)
            ->where('id', '!=', $milestone->id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('milestones/form', [
            'project' => $milestone->project,
            'milestone' => $milestone,
            'parents' => $parents,
            'statuses' => Milestone::STATUSES,
        ]);
    }

    public function update(Request $request, Milestone $milestone): RedirectResponse
    {
        Gate::authorize('edit', $milestone->project);

        $validated = $this->validateMilestone($request);
        $milestone->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('milestones.updated')]);

        return to_route('milestones.show', $milestone);
    }

    public function destroy(Request $request, Milestone $milestone): RedirectResponse
    {
        Gate::authorize('delete', $milestone->project);

        $projectId = $milestone->project_id;
        $milestone->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('milestones.deleted')]);

        return to_route('projects.milestones.index', $projectId);
    }

    public function complete(Request $request, Milestone $milestone): RedirectResponse
    {
        Gate::authorize('edit', $milestone->project);
        abort_if($milestone->is_completed, 422, 'Milestone is already completed.');

        $milestone->update([
            'is_completed' => true,
            'completed_at' => now(),
            'status' => 'completed',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('milestones.completed')]);

        return back();
    }

    public function reopen(Request $request, Milestone $milestone): RedirectResponse
    {
        Gate::authorize('edit', $milestone->project);
        abort_unless($milestone->is_completed, 422, 'Milestone is not completed.');

        $milestone->update([
            'is_completed' => false,
            'completed_at' => null,
            'status' => 'active',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('milestones.reopened')]);

        return back();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function validateMilestone(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'refs' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'string', 'in:'.implode(',', Milestone::STATUSES)],
            'start_on' => ['nullable', 'date'],
            'due_on' => ['nullable', 'date', 'after_or_equal:start_on'],
            'parent_id' => ['nullable', 'integer', 'exists:milestones,id'],
        ]);
    }
}
