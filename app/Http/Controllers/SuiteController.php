<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Section;
use App\Models\Suite;
use App\Models\TestCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SuiteController extends Controller
{
    public function index(Request $request, Project $project): Response|RedirectResponse
    {
        Gate::authorize('view', $project);

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

    public function create(Request $request, Project $project): Response|RedirectResponse
    {
        Gate::authorize('edit', $project);

        if ($this->suiteCapReached($project)) {
            Inertia::flash('toast', [
                'type'    => 'error',
                'message' => __('suites.single_mode_limit'),
            ]);

            return to_route('projects.suites.index', $project);
        }

        return Inertia::render('suites/create', [
            'project' => $project,
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        Gate::authorize('edit', $project);

        abort_if($this->suiteCapReached($project), 422, __('suites.single_mode_limit'));

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $validated['created_by'] = Auth::id();

        $suite = $project->suites()->create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('suites.created')]);

        return to_route('suites.show', $suite);
    }

    public function show(Request $request, Suite $suite): Response
    {
        Gate::authorize('view', $suite->project);

        $sections = $suite->sections()
            ->whereNull('parent_id')
            ->orderBy('display_order')
            ->with([
                'children'  => fn ($q) => $q->orderBy('display_order')
                                            ->with(['testCases' => fn ($q2) => $q2->withCount('requirements')->with('assignedTo:id,name')]),
                'testCases' => fn ($q) => $q->withCount('requirements')->with('assignedTo:id,name'),
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
                'name'        => __('sections.default_name'),
                'description' => null,
                'testCases'   => $unsectionedCases->map(fn (TestCase $tc) => $this->transformSuiteCase($tc))->values()->all(),
                'children'    => [],
            ];

            $serialized = collect([$virtualSection])->concat($serialized);
        }

        return Inertia::render('suites/show', [
            'project'  => $suite->project,
            'suite'    => $suite,
            'sections' => $serialized->values()->all(),
            'members'  => $suite->project->members()->get(['users.id', 'users.name']),
        ]);
    }

    public function edit(Request $request, Suite $suite): Response
    {
        Gate::authorize('edit', $suite->project);

        return Inertia::render('suites/edit', [
            'project' => $suite->project,
            'suite'   => $suite,
        ]);
    }

    public function update(Request $request, Suite $suite): RedirectResponse
    {
        Gate::authorize('edit', $suite->project);

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $suite->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('suites.updated')]);

        return back();
    }

    public function destroy(Request $request, Suite $suite): RedirectResponse
    {
        Gate::authorize('delete', $suite->project);

        $suite->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('suites.deleted')]);

        return to_route('projects.suites.index', $suite->project_id);
    }

    public function export(Request $request, Suite $suite): Response|RedirectResponse
    {
        Gate::authorize('view', $suite->project);

        return to_route('suites.show', $suite);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function suiteCapReached(Project $project): bool
    {
        if ($project->suite_mode === Project::SUITE_MULTI) {
            return false;
        }

        return $project->suites()->exists();
    }

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
}
