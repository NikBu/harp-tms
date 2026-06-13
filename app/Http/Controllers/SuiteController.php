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

        $sections = $suite->sections()
            ->whereNull('parent_id')
            ->orderBy('display_order')
            ->with([
                'children'             => fn ($q) => $q->orderBy('display_order')
                                                       ->with([
                                                           'testCases' => fn ($q2) => $q2->withCount('requirements')->with('assignedTo:id,name'),
                                                       ]),
                'testCases'            => fn ($q) => $q->withCount('requirements')->with('assignedTo:id,name'),
            ])
            ->get();

        $serialized = $sections->map(fn (Section $section) => $this->serializeSection($section));

        $unsectionedCases = $suite->testCases()
            ->whereNull('section_id')
            ->withCount('requirements')
            ->with('assignedTo:id,name')
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        if ($unsectionedCases->isNotEmpty()) {
            $virtualSection = [
                'id'          => 0,
                'suite_id'    => $suite->id,
                'parent_id'   => null,
                'name'        => __('app.sections.default_name'),
                'description' => null,
                'testCases'   => $unsectionedCases->map(fn (TestCase $tc) => $this->transformSuiteCase($tc))->values()->all(),
                'children'    => [],
            ];

            $serialized = collect([$virtualSection])->concat($serialized);
        }

        return Inertia::render('suites/show', [
            'project'  => $project,
            'suite'    => $suite,
            'sections' => $serialized->values()->all(),
            'members'  => $project->members()->get(['users.id', 'users.name']),
        ]);
    }

    /**
     * Serialize a section (and its children) to a plain array with integer
     * template/priority_id values that match the SuiteCase frontend contract.
     *
     * @return array<string, mixed>
     */
    private function serializeSection(Section $section): array
    {
        return [
            'id'          => $section->id,
            'suite_id'    => $section->suite_id,
            'parent_id'   => $section->parent_id,
            'name'        => $section->name,
            'description' => $section->description,
            'testCases'   => $section->testCases
                ->map(fn (TestCase $tc) => $this->transformSuiteCase($tc))
                ->values()
                ->all(),
            'children'    => $section->children
                ->map(fn (Section $child) => $this->serializeSection($child))
                ->values()
                ->all(),
        ];
    }

    /**
     * Map a TestCase to the SuiteCase shape expected by suites/show.tsx.
     *
     * @return array<string, mixed>
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
            'template'         => $templateInt === false ? 2 : (int) $templateInt,
            'type_id'          => $testCase->case_type,
            'priority_id'      => $priorityInt === false ? null : (int) $priorityInt,
            'estimate'         => $testCase->estimate,
            'references'       => $testCase->refs,
            'has_requirements' => ($testCase->requirements_count ?? 0) > 0,
            'assigned_to_id'   => $testCase->assigned_to,
            'assignee_name'    => $testCase->assignedTo?->name,
        ];
    }

    /**
     * Show the form for editing the specified suite.
     */
    public function edit(Request $request, Suite $suite): Response
    {
        $this->authorizeProjectAccess($request, $suite->project);

        return Inertia::render('suites/edit', [
            'project' => $suite->project,
            'suite'   => $suite,
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