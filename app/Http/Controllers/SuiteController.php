<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Suite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SuiteController extends Controller
{
    /**
     * Display a listing of the suites for the given project.
     */
    public function index(Request $request, Project $project): Response|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);

        if ($project->suite_mode === Project::SUITE_SINGLE) {
            $suite = $project->suites()->oldest('id')->first();

            if ($suite !== null) {
                return to_route('suites.show', $suite);
            }
        }

        return Inertia::render('suites/index', [
            'project' => $project,
            'suites'  => $project->suites()->latest()->paginate(20),
        ]);
    }

    /**
     * Show the form for creating a new suite.
     *
     * For single-suite modes, redirect away if a suite already exists.
     */
    public function create(Request $request, Project $project): Response|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);

        if ($this->suiteCapReached($project)) {
            Inertia::flash('toast', [
                'type'    => 'error',
                'message' => __('app.suites.single_mode_limit'),
            ]);

            return to_route('projects.suites.index', $project);
        }

        return Inertia::render('suites/create', [
            'project' => $project,
        ]);
    }

    /**
     * Store a newly created suite in storage.
     */
    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);

        // Enforce single-suite mode at the write layer as well
        abort_if($this->suiteCapReached($project), 422, __('app.suites.single_mode_limit'));

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $validated['created_by'] = Auth::id();

        $suite = $project->suites()->create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.suites.created')]);

        return to_route('suites.show', $suite);
    }

    /**
     * Display the specified suite with its section tree.
     */
    public function show(Request $request, Suite $suite): Response
    {
        $project = $suite->project;

        $this->authorizeProjectAccess($request, $project);

        $sections = $suite->sections()
            ->whereNull('parent_id')
            ->orderBy('display_order')
            ->with(['children' => fn ($q) => $q->orderBy('display_order'), 'testCases', 'children.testCases'])
            ->get();

        return Inertia::render('suites/show', [
            'project'  => $project,
            'suite'    => $suite,
            'sections' => $sections,
        ]);
    }

    /**
     * Update the specified suite in storage.
     */
    public function update(Request $request, Suite $suite): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $suite->project);

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $suite->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.suites.updated')]);

        return back();
    }

    /**
     * Remove the specified suite from storage.
     */
    public function destroy(Request $request, Suite $suite): RedirectResponse
    {
        $project = $suite->project;
        $user    = $request->user();

        $isProjectAdmin = $project->members()
            ->whereKey($user->getKey())
            ->wherePivot('role', 'project_admin')
            ->exists();

        abort_unless($isProjectAdmin || $user->hasRole('admin'), 403);

        $suite->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.suites.deleted')]);

        return to_route('projects.suites.index', $project);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Returns true when the project's suite mode only allows one suite
     * AND that suite already exists.
     *
     * SUITE_SINGLE (1)          → exactly one suite, no baseline branching
     * SUITE_SINGLE_BASELINE (2) → one active suite + baseline copies (those are
     *                             created programmatically, not by the user form)
     * SUITE_MULTI (3)           → no cap
     */
    private function suiteCapReached(Project $project): bool
    {
        if ($project->suite_mode === Project::SUITE_MULTI) {
            return false;
        }

        return $project->suites()->exists();
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