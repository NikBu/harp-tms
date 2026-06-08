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
     * Integer → string template contract shared between frontend and storage.
     * Order matches the frontend constants in types/test-case.ts.
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

    // -------------------------------------------------------------------------
    // Resource actions
    // -------------------------------------------------------------------------

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

    public function create(Request $request, Suite $suite): Response
    {
        $this->authorizeProjectAccess($request, $suite->project);

        return Inertia::render('test-cases/create', [
            'suite' => $suite->load('project'),
            'sections' => $suite->sections()->orderBy('display_order')->get(),
        ]);
    }

    public function store(Request $request, Suite $suite): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $suite->project);

        $validated = $this->validateCase($request);
        $template = self::TEMPLATE_MAP[$validated['template']];

        $testCase = $suite->testCases()->create($this->mapAttributes($validated, [
            'created_by' => Auth::id(),
        ]));

        $this->syncContent($testCase, $template, $request);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.created')]);

        return to_route('cases.show', $testCase);
    }

    public function show(Request $request, TestCase $testCase): Response
    {
        $this->authorizeProjectAccess($request, $testCase->suite->project);

        $testCase->load([
            'section:id,name',
            'steps',
            'createdBy:id,name',
            'requirements:id,display_id,title,priority,status',
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

    public function update(Request $request, TestCase $testCase): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $testCase->suite->project);

        $validated = $this->validateCase($request);
        $template = self::TEMPLATE_MAP[$validated['template']];

        $testCase->update($this->mapAttributes($validated, [
            'updated_by' => Auth::id(),
        ]));

        // Always re-sync content when a full update is submitted
        $testCase->steps()->delete();
        $testCase->update(['checklist_items' => null, 'bdd_scenario' => null]);
        $this->syncContent($testCase, $template, $request);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.updated')]);

        return to_route('cases.show', $testCase);
    }

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
                'title', 'template', 'case_type', 'priority', 'estimate',
                'estimate_forecast', 'preconditions', 'expected_result', 'refs',
                'automation_type', 'automation_id', 'status',
                'checklist_items', 'bdd_scenario', 'display_order',
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

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function validateCase(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'template' => ['required', 'integer', 'in:1,2,3,4,5'],
            'type_id' => ['nullable', 'string', 'max:100'],
            'priority_id' => ['nullable', 'integer', 'in:1,2,3,4'],
            'section_id' => ['nullable', 'integer', 'exists:sections,id'],
            'estimate' => ['nullable', 'string', 'max:50'],
            'references' => ['nullable', 'string'],
            'preconditions' => ['nullable', 'string'],
            'body' => ['nullable', 'string'],
            'bdd_scenario' => ['nullable', 'string'],
            'checklist_items' => ['nullable', 'array'],
            'checklist_items.*.label' => ['required_with:checklist_items', 'string'],
            'checklist_items.*.is_optional' => ['boolean'],
            'steps' => ['nullable', 'array'],
            'steps.*.action' => ['required_with:steps', 'string'],
            'steps.*.expected' => ['nullable', 'string'],
            'steps.*.display_order' => ['nullable', 'integer'],
        ]);
    }

    private function mapAttributes(array $validated, array $extra = []): array
    {
        return array_merge([
            'title' => $validated['title'],
            'template' => self::TEMPLATE_MAP[$validated['template']],
            'case_type' => $validated['type_id'] ?? null,
            'priority' => isset($validated['priority_id'])
                ? (self::PRIORITY_MAP[$validated['priority_id']] ?? null)
                : null,
            'section_id' => $validated['section_id'] ?? null,
            'estimate' => self::parseEstimate($validated['estimate'] ?? null),
            'refs' => $validated['references'] ?? null,
            'preconditions' => $validated['preconditions'] ?? null,
            'expected_result' => $validated['body'] ?? null,
        ], $extra);
    }

    private function syncContent(TestCase $testCase, string $template, Request $request): void
    {
        match ($template) {
            'steps', 'exploratory' => $this->syncSteps($testCase, $request),
            'bdd' => $this->syncBdd($testCase, $request),
            'checklist' => $this->syncChecklist($testCase, $request),
            default => null,
        };
    }

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

    private function syncBdd(TestCase $testCase, Request $request): void
    {
        $scenario = $request->input('bdd_scenario') ?? $request->input('body');

        if ($scenario !== null) {
            $testCase->update(['bdd_scenario' => $scenario]);
        }
    }

    private function syncChecklist(TestCase $testCase, Request $request): void
    {
        if ($request->filled('checklist_items')) {
            $items = array_map(
                fn (array $item): array => [
                    'label' => $item['label'],
                    'is_optional' => (bool) ($item['is_optional'] ?? false),
                ],
                $request->input('checklist_items'),
            );
        } elseif ($request->filled('steps')) {
            $items = array_map(
                fn (array $step): array => [
                    'label' => $step['action'],
                    'is_optional' => false,
                ],
                array_filter(
                    $request->input('steps'),
                    fn (array $s): bool => trim($s['action'] ?? '') !== '',
                ),
            );
        } else {
            return;
        }

        $testCase->update(['checklist_items' => array_values($items)]);
    }

    private static function parseEstimate(?string $value): ?int
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

    private function transformCase(TestCase $testCase): array
    {
        $templateInt = array_search($testCase->template, self::TEMPLATE_MAP, true);
        $priorityInt = array_search($testCase->priority, self::PRIORITY_MAP, true);

        return [
            'id' => $testCase->id,
            'suite_id' => $testCase->suite_id,
            'section_id' => $testCase->section_id,
            'section' => $testCase->relationLoaded('section') ? $testCase->section : null,
            'title' => $testCase->title,
            'template' => $templateInt === false ? 2 : $templateInt,
            'type_id' => $testCase->case_type,
            'priority_id' => $priorityInt === false ? null : $priorityInt,
            'estimate' => $testCase->estimate !== null
                ? self::formatEstimate($testCase->estimate)
                : null,
            'references' => $testCase->refs,
            'preconditions' => $testCase->preconditions,
            'body' => $testCase->expected_result,
            'bdd_scenario' => $testCase->bdd_scenario,
            'checklist_items' => $testCase->checklist_items,
            'steps' => $testCase->relationLoaded('steps')
                ? $testCase->steps->map(fn ($step): array => [
                    'id' => $step->id,
                    'test_case_id' => $step->test_case_id,
                    'action' => $step->content,
                    'expected' => $step->expected,
                    'display_order' => $step->step_index,
                ])->all()
                : null,
            'requirements' => $testCase->relationLoaded('requirements')
                ? $testCase->requirements->map(fn ($req): array => [
                    'id' => $req->id,
                    'display_id' => $req->display_id,
                    'title' => $req->title,
                    'priority' => $req->priority,
                    'status' => $req->status,
                ])->all()
                : null,
            'created_at' => $testCase->created_at,
            'updated_at' => $testCase->updated_at,
        ];
    }

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
