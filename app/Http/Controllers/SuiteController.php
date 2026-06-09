<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Section;
use App\Models\Suite;
use App\Models\TestCase;
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

        $withTestCases = fn ($q) => $q->withCount('requirements');

        $sections = $suite->sections()
            ->whereNull('parent_id')
            ->orderBy('display_order')
            ->with([
                'children' => fn ($q) => $q->orderBy('display_order'),
                'testCases' => $withTestCases,
                'children.testCases' => $withTestCases,
            ])
            ->get();

        $sections->each(fn (Section $section) => $this->transformSectionCases($section));

        return Inertia::render('suites/show', [
            'project'  => $project,
            'suite'    => $suite,
            'sections' => $sections,
        ]);
    }

    /**
     * Recursively transform every section's testCases so the frontend receives
     * integer template/priority keys (matching the SuiteCase contract) instead
     * of the string values stored in the database.
     */
    private function transformSectionCases(Section $section): void
    {
        if ($section->relationLoaded('testCases')) {
            $section->setRelation(
                'testCases',
                $section->testCases->map(fn (TestCase $testCase) => $this->transformSuiteCase($testCase)),
            );
        }

        if ($section->relationLoaded('children')) {
            $section->children->each(fn (Section $child) => $this->transformSectionCases($child));
        }
    }

    /**
     * Map a TestCase to the SuiteCase shape expected by suites/show.tsx.
     *
     * @return array{
     *     id: int,
     *     suite_id: int,
     *     section_id: int|null,
     *     title: string,
     *     template: int,
     *     type_id: string|null,
     *     priority_id: int|null,
     *     has_requirements: bool
     * }
     */
    private function transformSuiteCase(TestCase $testCase): array
    {
        $templateInt = array_search($testCase->template, TestCaseController::TEMPLATE_MAP, true);
        $priorityInt = array_search($testCase->priority, TestCaseController::PRIORITY_MAP, true);

        return [
            'id'               => $testCase->id,
            'suite_id'         => $testCase->suite_id,
            'section_id'       => $testCase->section_id,
            'title'            => $testCase->title,
            'template'         => $templateInt === false ? 2 : $templateInt,
            'type_id'          => $testCase->case_type,
            'priority_id'      => $priorityInt === false ? null : $priorityInt,
            'has_requirements' => ($testCase->requirements_count ?? 0) > 0,
        ];
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