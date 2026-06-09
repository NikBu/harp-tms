<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Requirement;
use App\Models\Section;
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
    public const TEMPLATE_MAP = [
        1 => 'text',
        2 => 'steps',
        3 => 'exploratory',
        4 => 'bdd',
        5 => 'checklist',
    ];

    /**
     * @var array<int, string>
     */
    public const PRIORITY_MAP = [
        1 => 'critical',
        2 => 'high',
        3 => 'medium',
        4 => 'low',
    ];

    // -------------------------------------------------------------------------
    // Resource actions
    // -------------------------------------------------------------------------

    public function index(Request $request, Suite $suite): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $suite->project);

        return to_route('suites.show', $suite);
    }

    public function create(Request $request, Suite $suite): Response
    {
        $this->authorizeProjectAccess($request, $suite->project);

        $requirements = Requirement::query()
            ->where('project_id', $suite->project_id)
            ->orderBy('display_id')
            ->get(['id', 'display_id', 'title', 'priority', 'status']);

        return Inertia::render('test-cases/create', [
            'suite'        => $suite->load('project'),
            'suites'       => $suite->project->suites()->orderBy('name')->get(['id', 'name']),
            'sections'     => $suite->sections()->orderBy('display_order')->get(),
            'requirements' => $requirements,
            'members'      => $suite->project->members()->get(['users.id', 'users.name']),
        ]);
    }

    /**
     * Global create form: no suite pre-selected. The user picks a suite in the
     * form, which dynamically loads that suite's sections.
     */
    public function createGlobal(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $requirements = Requirement::query()
            ->where('project_id', $project->id)
            ->orderBy('display_id')
            ->get(['id', 'display_id', 'title', 'priority', 'status']);

        return Inertia::render('test-cases/create', [
            'suite'        => null,
            'suites'       => $project->suites()->orderBy('name')->get(['id', 'name']),
            'project'      => $project->only(['id', 'name']),
            'sections'     => [],
            'requirements' => $requirements,
            'members'      => $project->members()->get(['users.id', 'users.name']),
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

        // Sync requirement linkage
        if ($request->filled('requirement_ids')) {
            $ids = collect($request->input('requirement_ids'))
                ->filter(fn ($v) => is_int($v) || ctype_digit((string) $v))
                ->map(fn ($v) => (int) $v)
                ->all();

            // Only attach IDs not already linked — avoids triggering an UPDATE
            // on the pivot (which has no updated_at column).
            $existing = $testCase->requirements()->pluck('requirements.id')->all();
            $toAttach = array_diff($ids, $existing);

            if ($toAttach) {
                $testCase->requirements()->attach(
                    array_fill_keys($toAttach, ['created_by' => Auth::id()]),
                );
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.created')]);

        if ($request->boolean('add_and_create')) {
            return to_route('suites.cases.create', $suite);
        }

        return to_route('cases.show', $testCase);
    }

    public function edit(Request $request, TestCase $testCase): Response
    {
        $this->authorizeProjectAccess($request, $testCase->suite->project);

        $testCase->load(['steps', 'requirements:id,display_id,title,priority,status']);

        $requirements = Requirement::query()
            ->where('project_id', $testCase->suite->project_id)
            ->orderBy('display_id')
            ->get(['id', 'display_id', 'title', 'priority', 'status']);

        return Inertia::render('test-cases/edit', [
            'testCase' => $this->transformCase($testCase),
            'suite' => $testCase->suite->load('project'),
            'sections' => $testCase->suite->sections()->orderBy('display_order')->get(),
            'requirements' => $requirements,
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

        $testCase->steps()->delete();
        $testCase->update(['checklist_items' => null, 'bdd_scenario' => null]);
        $this->syncContent($testCase, $template, $request);

        // Full sync — replaces the full set of linked requirements
        if ($request->has('requirement_ids')) {
            $ids = collect($request->input('requirement_ids', []))
                ->filter(fn ($v) => is_int($v) || ctype_digit((string) $v))
                ->map(fn ($v) => (int) $v)
                ->all();

            $syncData = array_fill_keys($ids, [
                'created_by' => Auth::id(),
                'created_at' => now(),
            ]);

            // sync() (with detach) — the edit form sends the complete desired state
            $testCase->requirements()->sync($syncData);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.updated')]);

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

        $siblings = $testCase->section_id !== null
            ? $suite->testCases()
                ->where('section_id', $testCase->section_id)
                ->orderBy('display_order')
                ->orderBy('id')
                ->pluck('id')
                ->all()
            : $suite->testCases()
                ->orderBy('display_order')
                ->orderBy('id')
                ->pluck('id')
                ->all();

        $position = array_search($testCase->id, $siblings, true);

        return Inertia::render('test-cases/show', [
            'testCase' => $this->transformCase($testCase),
            'suite' => $suite,
            'suiteId' => $suite->id,
            'prevCaseId' => $position !== false ? ($siblings[$position - 1] ?? null) : null,
            'nextCaseId' => $position !== false ? ($siblings[$position + 1] ?? null) : null,
            'projectSuites' => $suite->project->suites()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
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

        DB::transaction(function () use ($testCase, $targetSuite, $validated): TestCase {
            $attributes = $testCase->only([
                'title', 'template', 'case_type', 'priority', 'estimate',
                'estimate_forecast', 'preconditions', 'expected_result', 'refs',
                'automation_type', 'automation_id', 'status',
                'checklist_items', 'bdd_scenario', 'display_order',
            ]);

            $attributes['title'] = $testCase->title.' (Copy)';
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

        return back();
    }

    /**
     * Apply a partial update to many test cases at once.
     */
    public function bulkUpdate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids'        => ['required', 'array'],
            'ids.*'      => ['integer', 'exists:test_cases,id'],
            'priority'   => ['nullable', 'in:critical,high,medium,low'],
            'section_id' => ['nullable', 'integer'],
            'case_type'  => ['nullable', 'string', 'max:100'],
        ]);

        $cases = TestCase::query()->whereIn('id', $validated['ids'])->with('suite.project')->get();

        $this->authorizeBulk($request, $cases);

        $update = array_filter([
            'priority'   => $validated['priority'] ?? null,
            'case_type'  => $validated['case_type'] ?? null,
        ], fn ($value): bool => $value !== null && $value !== '');

        // Section moves: a section_id of 0 (or null when the key is present)
        // unsets the section, moving cases into the virtual "Test Cases" group.
        if ($request->has('section_id')) {
            $sectionId = $validated['section_id'] ?? null;

            if ($sectionId !== null && $sectionId !== 0) {
                abort_unless(Section::query()->whereKey($sectionId)->exists(), 422);
                $update['section_id'] = $sectionId;
            } else {
                $update['section_id'] = null;
            }
        }

        if ($update !== []) {
            TestCase::query()->whereIn('id', $validated['ids'])->update($update);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.bulk_updated')]);

        return back();
    }

    /**
     * Delete many test cases at once.
     */
    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids'   => ['required', 'array'],
            'ids.*' => ['integer', 'exists:test_cases,id'],
        ]);

        $cases = TestCase::query()->whereIn('id', $validated['ids'])->with('suite.project')->get();

        $this->authorizeBulk($request, $cases);

        TestCase::query()->whereIn('id', $validated['ids'])->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.bulk_deleted')]);

        return back();
    }

    /**
     * Bulk-assign many test cases to a single user (or unassign with null).
     */
    public function bulkAssign(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids'            => ['required', 'array'],
            'ids.*'          => ['integer', 'exists:test_cases,id'],
            'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $cases = TestCase::query()->whereIn('id', $validated['ids'])->with('suite.project')->get();

        $this->authorizeBulk($request, $cases);

        TestCase::query()
            ->whereIn('id', $validated['ids'])
            ->update(['assigned_to' => $validated['assigned_to_id'] ?? null]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.test_cases.bulk_updated')]);

        return back();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Authorize a bulk action: every case must belong to a project the user can access.
     *
     * @param  \Illuminate\Support\Collection<int, TestCase>  $cases
     */
    private function authorizeBulk(Request $request, $cases): void
    {
        foreach ($cases->pluck('suite.project')->filter()->unique('id') as $project) {
            $this->authorizeProjectAccess($request, $project);
        }
    }

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
            'requirement_ids' => ['nullable', 'array'],
            'requirement_ids.*' => ['integer', 'exists:requirements,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
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
            'refs'            => $validated['references'] ?? null,
            'preconditions'   => $validated['preconditions'] ?? null,
            'expected_result' => $validated['body'] ?? null,
            'assigned_to'     => $validated['assigned_to'] ?? null,
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
