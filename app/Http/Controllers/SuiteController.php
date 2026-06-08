<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Section;
use App\Models\Suite;
use App\Models\TestCase;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SuiteController extends Controller
{
    /**
     * Maximum section nesting depth to eager-load for the cases view.
     */
    private const MAX_SECTION_DEPTH = 10;

    /**
     * Integer → template-name contract shared with the frontend.
     *
     * @var array<int, string>
     */
    private const TEMPLATE_MAP = [
        1 => 'text',
        2 => 'steps',
        3 => 'exploratory',
        4 => 'bdd',
        5 => 'checklist',
    ];

    /**
     * @var array<int, string>
     */
    private const PRIORITY_MAP = [
        1 => 'critical',
        2 => 'high',
        3 => 'medium',
        4 => 'low',
    ];
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

            return to_route('suites.index', $project);
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
     * Display the specified suite with its section tree and test cases.
     */
    public function show(Request $request, Suite $suite): Response
    {
        $project = $suite->project;

        $this->authorizeProjectAccess($request, $project);

        $suite->load([
            'sections' => function (HasMany $query): void {
                $query->whereNull('parent_id')
                    ->orderBy('display_order')
                    ->orderBy('id')
                    ->with($this->sectionEagerLoad(self::MAX_SECTION_DEPTH));
            },
        ]);

        $unsectionedCases = $suite->testCases()
            ->whereNull('section_id')
            ->orderBy('display_order')
            ->orderBy('id')
            ->get()
            ->map(fn (TestCase $case): array => $this->transformCase($case))
            ->all();

        $sections = $suite->sections
            ->map(fn (Section $section): array => $this->transformSection($section))
            ->all();

        return Inertia::render('suites/show', [
            'project'           => $project,
            'suite'             => [
                'id'          => $suite->id,
                'project_id'  => $suite->project_id,
                'name'        => $suite->name,
                'description' => $suite->description,
                'sections'    => $sections,
            ],
            'unsectioned_cases' => $unsectionedCases,
        ]);
    }

    /**
     * Build a nested eager-load array for sections and their test cases,
     * descending up to the given depth.
     *
     * @return array<string, callable>
     */
    private function sectionEagerLoad(int $depth): array
    {
        $orderCases = function (HasMany $query): void {
            $query->orderBy('display_order')->orderBy('id');
        };

        if ($depth <= 0) {
            return ['testCases' => $orderCases];
        }

        return [
            'testCases' => $orderCases,
            'children'  => function (HasMany $query) use ($depth): void {
                $query->orderBy('display_order')
                    ->orderBy('id')
                    ->with($this->sectionEagerLoad($depth - 1));
            },
        ];
    }

    /**
     * Transform a section (and its children recursively) into the array shape
     * consumed by the suite cases view.
     *
     * @return array{id: int, name: string, parent_id: int|null, testCases: array<int, array<string, mixed>>, children: array<int, array<string, mixed>>}
     */
    private function transformSection(Section $section): array
    {
        return [
            'id'        => $section->id,
            'name'      => $section->name,
            'parent_id' => $section->parent_id,
            'testCases' => $section->testCases
                ->map(fn (TestCase $case): array => $this->transformCase($case))
                ->all(),
            'children'  => $section->children
                ->map(fn (Section $child): array => $this->transformSection($child))
                ->all(),
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

        return to_route('suites.index', $project);
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

    /**
     * Transform a test case into the array shape consumed by the cases view.
     *
     * Mirrors the contract produced by TestCaseController so the frontend
     * `TestCase` type is shared across views.
     *
     * @return array<string, mixed>
     */
    private function transformCase(TestCase $testCase): array
    {
        $templateInt = array_search($testCase->template, self::TEMPLATE_MAP, true);
        $priorityInt = array_search($testCase->priority, self::PRIORITY_MAP, true);

        return [
            'id'          => $testCase->id,
            'suite_id'    => $testCase->suite_id,
            'section_id'  => $testCase->section_id,
            'title'       => $testCase->title,
            'template'    => $templateInt === false ? 2 : $templateInt,
            'type_id'     => $testCase->case_type,
            'priority_id' => $priorityInt === false ? null : $priorityInt,
            'estimate'    => $testCase->estimate !== null
                ? self::formatEstimate($testCase->estimate)
                : null,
            'references'  => $testCase->refs,
        ];
    }

    /**
     * Format an estimate (in seconds) into a human-readable string.
     */
    private static function formatEstimate(int $seconds): string
    {
        if ($seconds <= 0) {
            return '0';
        }

        $h = intdiv($seconds, 3600);
        $m = intdiv($seconds % 3600, 60);
        $s = $seconds % 60;

        $parts = [];
        if ($h > 0) {
            $parts[] = "{$h}h";
        }
        if ($m > 0) {
            $parts[] = "{$m}m";
        }
        if ($s > 0) {
            $parts[] = "{$s}s";
        }

        return implode(' ', $parts);
    }
}