<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Suite;
use App\Models\TestCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TestCaseController extends Controller
{
    /**
     * Map between the integer template contract used by the frontend and the
     * string template values persisted on the model.
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
     * Map between the integer priority contract used by the frontend and the
     * string priority values persisted on the model.
     *
     * @var array<int, string>
     */
    private const PRIORITY_MAP = [
        1 => 'critical',
        2 => 'high',
        3 => 'medium',
        4 => 'low',
    ];

    /**
     * Display a listing of the test cases for the given suite.
     */
    public function index(Request $request, Suite $suite): Response
    {
        $this->authorizeProjectAccess($request, $suite->project);

        $query = $suite->testCases()
            ->with('section:id,name')
            ->orderBy('display_order')
            ->orderBy('id');

        if ($request->filled('section_id')) {
            $query->where('section_id', $request->integer('section_id'));
        }

        $cases = $query->paginate(50)->through(fn (TestCase $case): array => $this->transformCase($case));

        return Inertia::render('test-cases/index', [
            'suite' => $suite->load('project'),
            'cases' => $cases,
            'sections' => $suite->sections()->orderBy('display_order')->get(),
            'filters' => ['section_id' => $request->integer('section_id') ?: null],
        ]);
    }

    /**
     * Show the form for creating a new test case.
     */
    public function create(Request $request, Suite $suite): Response
    {
        $this->authorizeProjectAccess($request, $suite->project);

        return Inertia::render('test-cases/create', [
            'suite' => $suite->load('project'),
            'sections' => $suite->sections()->orderBy('display_order')->get(),
        ]);
    }

    /**
     * Store a newly created test case in storage.
     */
    public function store(Request $request, Suite $suite): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $suite->project);

        $validated = $this->validateCase($request);

        $testCase = $suite->testCases()->create($this->mapAttributes($validated, [
            'created_by' => Auth::id(),
        ]));

        $this->syncSteps($testCase, $request);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.created')]);

        return to_route('cases.show', $testCase);
    }

    /**
     * Display the specified test case.
     */
    public function show(Request $request, TestCase $testCase): Response
    {
        $this->authorizeProjectAccess($request, $testCase->suite->project);

        $testCase->load([
            'section:id,name',
            'steps',
            'createdBy:id,name',
        ]);

        $suite = $testCase->suite->load('project');

        return Inertia::render('test-cases/show', [
            'testCase' => $this->transformCase($testCase),
            'suite' => $suite,
            'projectSuites' => $suite->project->suites()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Show the form for editing the specified test case.
     */
    public function edit(Request $request, TestCase $testCase): Response
    {
        $this->authorizeProjectAccess($request, $testCase->suite->project);

        $testCase->load('steps');

        return Inertia::render('test-cases/edit', [
            'testCase' => $this->transformCase($testCase),
            'suite' => $testCase->suite->load('project'),
            'sections' => $testCase->suite->sections()->orderBy('display_order')->get(),
        ]);
    }

    /**
     * Update the specified test case in storage.
     */
    public function update(Request $request, TestCase $testCase): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $testCase->suite->project);

        $validated = $this->validateCase($request);

        $testCase->update($this->mapAttributes($validated, [
            'updated_by' => Auth::id(),
        ]));

        if ($request->has('steps')) {
            $testCase->steps()->delete();
            $this->syncSteps($testCase, $request);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.updated')]);

        return to_route('cases.show', $testCase);
    }

    /**
     * Remove the specified test case from storage.
     */
    public function destroy(Request $request, TestCase $testCase): RedirectResponse
    {
        $suite = $testCase->suite;
        $project = $suite->project;
        $user = $request->user();

        $isProjectAdmin = $project->members()
            ->whereKey($user->getKey())
            ->wherePivot('role', 'project_admin')
            ->exists();

        abort_unless($isProjectAdmin || $user->hasRole('admin'), 403);

        $testCase->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.deleted')]);

        return to_route('suites.cases.index', $suite);
    }

    /**
     * Duplicate the test case into another suite within the same project.
     */
    public function copy(Request $request, TestCase $testCase): RedirectResponse
    {
        $project = $testCase->suite->project;
        $user = $request->user();

        $isProjectAdmin = $project->members()
            ->whereKey($user->getKey())
            ->wherePivot('role', 'project_admin')
            ->exists();

        abort_unless($isProjectAdmin || $user->hasRole('admin'), 403);

        $validated = $request->validate([
            'suite_id' => ['required', 'integer', 'exists:suites,id'],
            'section_id' => ['nullable', 'integer', 'exists:sections,id'],
        ]);

        $targetSuite = Suite::findOrFail($validated['suite_id']);

        abort_unless($targetSuite->project_id === $project->id, 422);

        $copy = DB::transaction(function () use ($testCase, $targetSuite, $validated): TestCase {
            $attributes = $testCase->only([
                'title',
                'template',
                'case_type',
                'priority',
                'estimate',
                'estimate_forecast',
                'preconditions',
                'expected_result',
                'refs',
                'automation_type',
                'automation_id',
                'status',
                'checklist_items',
                'bdd_scenario',
                'display_order',
            ]);

            $attributes['suite_id'] = $targetSuite->id;
            $attributes['section_id'] = $validated['section_id'] ?? null;
            $attributes['created_by'] = Auth::id();
            $attributes['updated_by'] = null;

            $copy = $targetSuite->testCases()->create($attributes);

            foreach ($testCase->steps()->get() as $step) {
                $copy->steps()->create([
                    'step_index' => $step->step_index,
                    'content' => $step->content,
                    'expected' => $step->expected,
                ]);
            }

            return $copy;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.copied')]);

        return to_route('cases.show', $copy);
    }

    /**
     * Validate the request payload for creating or updating a test case.
     *
     * @return array<string, mixed>
     */
    private function validateCase(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'template' => ['required', 'integer', 'in:1,2,3,4,5'],
            'type_id' => ['nullable', 'integer'],
            'priority_id' => ['nullable', 'integer'],
            'section_id' => ['nullable', 'integer', 'exists:sections,id'],
            'estimate' => ['nullable', 'string', 'max:50'],
            'references' => ['nullable', 'string'],
            'preconditions' => ['nullable', 'string'],
            'body' => ['nullable', 'string'],
            'steps' => ['nullable', 'array'],
            'steps.*.action' => ['required_with:steps', 'string'],
            'steps.*.expected' => ['nullable', 'string'],
            'steps.*.display_order' => ['nullable', 'integer'],
        ]);
    }

    /**
     * Translate the validated frontend payload into the model's column shape.
     *
     * @param  array<string, mixed>  $validated
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function mapAttributes(array $validated, array $extra = []): array
    {
        $estimate = $validated['estimate'] ?? null;

        return array_merge([
            'title' => $validated['title'],
            'template' => self::TEMPLATE_MAP[$validated['template']],
            'case_type' => isset($validated['type_id']) ? (string) $validated['type_id'] : null,
            'priority' => isset($validated['priority_id']) ? (self::PRIORITY_MAP[$validated['priority_id']] ?? null) : null,
            'section_id' => $validated['section_id'] ?? null,
            'estimate' => is_numeric($estimate) ? (int) $estimate : null,
            'refs' => $validated['references'] ?? null,
            'preconditions' => $validated['preconditions'] ?? null,
            'expected_result' => $validated['body'] ?? null,
        ], $extra);
    }

    /**
     * Persist the submitted steps for the given test case.
     */
    private function syncSteps(TestCase $testCase, Request $request): void
    {
        if (! $request->filled('steps')) {
            return;
        }

        foreach ($request->input('steps') as $index => $step) {
            $testCase->steps()->create([
                'content' => $step['action'],
                'expected' => $step['expected'] ?? null,
                'step_index' => $step['display_order'] ?? ($index + 1),
            ]);
        }
    }

    /**
     * Shape a test case for the frontend contract defined in test-case.ts.
     *
     * @return array<string, mixed>
     */
    private function transformCase(TestCase $testCase): array
    {
        $template = array_search($testCase->template, self::TEMPLATE_MAP, true);
        $priority = array_search($testCase->priority, self::PRIORITY_MAP, true);

        return [
            'id' => $testCase->id,
            'suite_id' => $testCase->suite_id,
            'section_id' => $testCase->section_id,
            'section' => $testCase->relationLoaded('section') ? $testCase->section : null,
            'title' => $testCase->title,
            'template' => $template === false ? 2 : $template,
            'type_id' => is_numeric($testCase->case_type) ? (int) $testCase->case_type : null,
            'priority_id' => $priority === false ? null : $priority,
            'estimate' => $testCase->estimate !== null ? (string) $testCase->estimate : null,
            'references' => $testCase->refs,
            'preconditions' => $testCase->preconditions,
            'body' => $testCase->expected_result,
            'steps' => $testCase->relationLoaded('steps')
                ? $testCase->steps->map(fn ($step): array => [
                    'id' => $step->id,
                    'test_case_id' => $step->test_case_id,
                    'action' => $step->content,
                    'expected' => $step->expected,
                    'display_order' => $step->step_index,
                ])->all()
                : null,
            'created_at' => $testCase->created_at,
            'updated_at' => $testCase->updated_at,
        ];
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
