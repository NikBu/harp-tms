<?php

namespace App\Http\Controllers;

use App\Models\CustomField;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\Section;
use App\Models\Suite;
use App\Models\TestCase;
use App\Models\TestCaseCustomValue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TestCaseController extends Controller
{
    public const TEMPLATE_MAP = [
        1 => 'text',
        2 => 'steps',
        3 => 'exploratory',
        4 => 'bdd',
        5 => 'checklist',
    ];

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
        Gate::authorize('view', $suite->project);
        return to_route('suites.show', $suite);
    }

    public function create(Request $request, Suite $suite): Response
    {
        Gate::authorize('edit', $suite->project);

        $requirements = Requirement::query()
            ->where('project_id', $suite->project_id)
            ->orderBy('display_id')
            ->get(['id', 'display_id', 'title', 'priority', 'status']);

        return Inertia::render('test-cases/create', [
            'suite'         => $suite->load('project'),
            'suites'        => $suite->project->suites()->orderBy('name')->get(['id', 'name']),
            'sections'      => $suite->sections()->orderBy('display_order')->get(),
            'requirements'  => $requirements,
            'members'       => $suite->project->members()->get(['users.id', 'users.name']),
            'custom_fields' => $this->loadCaseFields($suite->project_id),
        ]);
    }

    public function createGlobal(Request $request, Project $project): Response
    {
        Gate::authorize('edit', $project);

        $requirements = Requirement::query()
            ->where('project_id', $project->id)
            ->orderBy('display_id')
            ->get(['id', 'display_id', 'title', 'priority', 'status']);

        return Inertia::render('test-cases/create', [
            'suite'         => null,
            'suites'        => $project->suites()->orderBy('name')->get(['id', 'name']),
            'project'       => $project->only(['id', 'name']),
            'sections'      => [],
            'requirements'  => $requirements,
            'members'       => $project->members()->get(['users.id', 'users.name']),
            'custom_fields' => $this->loadCaseFields($project->id),
        ]);
    }

    public function store(Request $request, Suite $suite): RedirectResponse
    {
        Gate::authorize('edit', $suite->project);

        $validated = $this->validateCase($request);
        $template  = self::TEMPLATE_MAP[$validated['template']];

        DB::transaction(function () use ($request, $suite, $validated, $template): TestCase {
            $testCase = $suite->testCases()->create($this->mapAttributes($validated, [
                'created_by' => Auth::id(),
            ]));

            $this->syncContent($testCase, $template, $request);

            if ($request->filled('requirement_ids')) {
                $ids = collect($request->input('requirement_ids'))
                    ->filter(fn ($v) => is_int($v) || ctype_digit((string) $v))
                    ->map(fn ($v) => (int) $v)
                    ->all();

                $existing = $testCase->requirements()->pluck('requirements.id')->all();
                $toAttach = array_diff($ids, $existing);

                if ($toAttach) {
                    // Only pass created_by; the pivot's useCurrent() handles created_at.
                    // Do NOT include created_at here — Eloquent would also inject
                    // updated_at which does not exist on this pivot table.
                    $testCase->requirements()->attach(
                        array_fill_keys($toAttach, ['created_by' => Auth::id()]),
                    );
                }
            }

            $this->syncCustomValues($testCase, $request->input('custom_values', []));

            return $testCase;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('test_cases.created')]);

        // Re-fetch testCase for redirect (created inside transaction)
        $testCase = $suite->testCases()->latest('id')->first();

        if ($request->boolean('add_and_create')) {
            return to_route('suites.cases.create', $suite);
        }

        return to_route('cases.show', $testCase);
    }

    public function edit(Request $request, TestCase $testCase): Response
    {
        Gate::authorize('edit', $testCase->suite->project);

        $testCase->load(['steps', 'requirements:id,display_id,title,priority,status', 'customValues.customField']);

        $requirements = Requirement::query()
            ->where('project_id', $testCase->suite->project_id)
            ->orderBy('display_id')
            ->get(['id', 'display_id', 'title', 'priority', 'status']);

        return Inertia::render('test-cases/edit', [
            'testCase'      => $this->transformCase($testCase),
            'suite'         => $testCase->suite->load('project'),
            'sections'      => $testCase->suite->sections()->orderBy('display_order')->get(),
            'requirements'  => $requirements,
            'custom_fields' => $this->loadCaseFields($testCase->suite->project_id),
        ]);
    }

    public function update(Request $request, TestCase $testCase): RedirectResponse
    {
        Gate::authorize('edit', $testCase->suite->project);

        $validated = $this->validateCase($request);
        $template  = self::TEMPLATE_MAP[$validated['template']];

        DB::transaction(function () use ($request, $testCase, $validated, $template): void {
            $testCase->update($this->mapAttributes($validated, ['updated_by' => Auth::id()]));

            $testCase->steps()->delete();
            $testCase->update(['checklist_items' => null, 'bdd_scenario' => null]);
            $this->syncContent($testCase, $template, $request);

            if ($request->has('requirement_ids')) {
                $ids = collect($request->input('requirement_ids', []))
                    ->filter(fn ($v) => is_int($v) || ctype_digit((string) $v))
                    ->map(fn ($v) => (int) $v)
                    ->all();

                // Only pass created_by; omit created_at to prevent Eloquent
                // from appending updated_at (which does not exist on this pivot).
                $syncData = array_fill_keys($ids, [
                    'created_by' => Auth::id(),
                ]);

                $testCase->requirements()->sync($syncData);
            }

            $this->syncCustomValues($testCase, $request->input('custom_values', []));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('test_cases.updated')]);
        return to_route('cases.show', $testCase);
    }

    public function show(Request $request, TestCase $testCase): Response
    {
        Gate::authorize('view', $testCase->suite->project);

        $testCase->load([
            'section:id,name',
            'steps',
            'createdBy:id,name',
            'requirements:id,display_id,title,priority,status',
            'customValues.customField',
        ]);

        $suite    = $testCase->suite->load('project');
        $siblings = $testCase->section_id !== null
            ? $suite->testCases()->where('section_id', $testCase->section_id)->orderBy('display_order')->orderBy('id')->pluck('id')->all()
            : $suite->testCases()->orderBy('display_order')->orderBy('id')->pluck('id')->all();

        $position = array_search($testCase->id, $siblings, true);

        return Inertia::render('test-cases/show', [
            'testCase'      => $this->transformCase($testCase),
            'suite'         => $suite,
            'suiteId'       => $suite->id,
            'prevCaseId'    => $position !== false ? ($siblings[$position - 1] ?? null) : null,
            'nextCaseId'    => $position !== false ? ($siblings[$position + 1] ?? null) : null,
            'projectSuites' => $suite->project->suites()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function destroy(Request $request, TestCase $testCase): RedirectResponse
    {
        Gate::authorize('delete', $testCase->suite->project);

        $suite = $testCase->suite;
        $testCase->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('test_cases.deleted')]);
        return to_route('suites.cases.index', $suite);
    }

    public function copy(Request $request, TestCase $testCase): RedirectResponse
    {
        Gate::authorize('edit', $testCase->suite->project);

        $validated = $request->validate([
            'suite_id'   => ['required', 'integer', 'exists:suites,id'],
            'section_id' => ['nullable', 'integer', 'exists:sections,id'],
        ]);

        $targetSuite = Suite::findOrFail($validated['suite_id']);
        abort_unless($targetSuite->project_id === $testCase->suite->project_id, 422);

        DB::transaction(function () use ($testCase, $targetSuite, $validated): TestCase {
            $attributes            = $testCase->only([
                'title', 'template', 'case_type', 'priority', 'estimate',
                'estimate_forecast', 'preconditions', 'expected_result', 'refs',
                'automation_type', 'automation_id', 'status',
                'checklist_items', 'bdd_scenario', 'display_order',
            ]);
            $attributes['title']      = $testCase->title.' (Copy)';
            $attributes['suite_id']   = $targetSuite->id;
            $attributes['section_id'] = $validated['section_id'] ?? null;
            $attributes['created_by'] = Auth::id();
            $attributes['updated_by'] = null;

            $copy = $targetSuite->testCases()->create($attributes);

            foreach ($testCase->steps()->get() as $step) {
                $copy->steps()->create([
                    'step_index' => $step->step_index,
                    'content'    => $step->content,
                    'expected'   => $step->expected,
                ]);
            }

            // Copy custom values
            foreach ($testCase->customValues()->with('customField')->get() as $cv) {
                $copy->customValues()->create([
                    'custom_field_id' => $cv->custom_field_id,
                    'value_string'    => $cv->value_string,
                    'value_integer'   => $cv->value_integer,
                    'value_text'      => $cv->value_text,
                    'value_boolean'   => $cv->value_boolean,
                    'value_json'      => $cv->value_json,
                ]);
            }

            return $copy;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('test_cases.copied')]);
        return back();
    }

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
        $this->authorizeBulkEdit($cases);

        $update = array_filter([
            'priority'  => $validated['priority'] ?? null,
            'case_type' => $validated['case_type'] ?? null,
        ], fn ($value): bool => $value !== null && $value !== '');

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

        Inertia::flash('toast', ['type' => 'success', 'message' => __('test_cases.bulk_updated')]);
        return back();
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids'   => ['required', 'array'],
            'ids.*' => ['integer', 'exists:test_cases,id'],
        ]);

        $cases = TestCase::query()->whereIn('id', $validated['ids'])->with('suite.project')->get();
        $this->authorizeBulkDelete($cases);

        TestCase::query()->whereIn('id', $validated['ids'])->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('test_cases.bulk_deleted')]);
        return back();
    }

    public function bulkAssign(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids'            => ['required', 'array'],
            'ids.*'          => ['integer', 'exists:test_cases,id'],
            'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $cases = TestCase::query()->whereIn('id', $validated['ids'])->with('suite.project')->get();
        $this->authorizeBulkEdit($cases);

        TestCase::query()->whereIn('id', $validated['ids'])->update(['assigned_to' => $validated['assigned_to_id'] ?? null]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('test_cases.bulk_updated')]);
        return back();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Load custom fields that apply to cases for a given project.
     * Returns global fields + fields explicitly assigned to the project.
     */
    private function loadCaseFields(int $projectId): \Illuminate\Support\Collection
    {
        return CustomField::query()
            ->where('applies_to', 'cases')
            ->where(function ($q) use ($projectId) {
                $q->where('is_global', true)
                  ->orWhereHas('projects', fn ($q2) => $q2->where('projects.id', $projectId));
            })
            ->with('options')
            ->leftJoin('custom_field_project as cfp', function ($join) use ($projectId) {
                $join->on('cfp.custom_field_id', '=', 'custom_fields.id')
                     ->where('cfp.project_id', '=', $projectId);
            })
            ->orderByRaw('COALESCE(cfp.display_order, 9999)')
            ->orderBy('custom_fields.id')
            ->select('custom_fields.*', 'cfp.is_required', 'cfp.display_order', 'cfp.default_value')
            ->get()
            ->map(fn (CustomField $field): array => [
                'id'            => $field->id,
                'system_name'   => $field->system_name,
                'label'         => $field->label,
                'description'   => $field->description,
                'field_type'    => $field->field_type,
                'applies_to'    => $field->applies_to,
                'is_global'     => $field->is_global,
                'is_required'   => (bool) ($field->is_required ?? false),
                'display_order' => $field->display_order ?? 9999,
                'default_value' => $field->default_value ?? null,
                'options'       => $field->options->map(fn ($opt) => [
                    'id'            => $opt->id,
                    'label'         => $opt->label,
                    'display_order' => $opt->display_order,
                ])->all(),
            ]);
    }

    /**
     * Persist custom_values submitted from the form into test_case_custom_values.
     * Accepts array of [field_id => value] from request input.
     */
    private function syncCustomValues(TestCase $testCase, array $rawValues): void
    {
        if (empty($rawValues)) {
            return;
        }

        $fieldIds = array_keys($rawValues);
        $fields   = CustomField::whereIn('id', $fieldIds)->get()->keyBy('id');

        foreach ($rawValues as $fieldId => $value) {
            $field = $fields->get((int) $fieldId);
            if (! $field) {
                continue;
            }

            $row = [
                'value_string'  => null,
                'value_integer' => null,
                'value_text'    => null,
                'value_boolean' => null,
                'value_json'    => null,
            ];

            match ($field->field_type) {
                'string', 'url'               => $row['value_string']  = (string) $value,
                'integer'                     => $row['value_integer'] = $value !== '' && $value !== null ? (int) $value : null,
                'text', 'rich_text'           => $row['value_text']    = (string) $value,
                'checkbox'                    => $row['value_boolean'] = (bool) $value,
                'date'                        => $row['value_string']  = (string) $value,
                'dropdown', 'user', 'milestone' => $row['value_string'] = (string) $value,
                'multi_select', 'steps',
                'step_results'                => $row['value_json']    = is_array($value) ? $value : [],
                default                       => null,
            };

            TestCaseCustomValue::updateOrCreate(
                ['test_case_id' => $testCase->id, 'custom_field_id' => (int) $fieldId],
                $row,
            );
        }
    }

    /** @param \Illuminate\Support\Collection<int, TestCase> $cases */
    private function authorizeBulkEdit($cases): void
    {
        foreach ($cases->pluck('suite.project')->filter()->unique('id') as $project) {
            Gate::authorize('edit', $project);
        }
    }

    /** @param \Illuminate\Support\Collection<int, TestCase> $cases */
    private function authorizeBulkDelete($cases): void
    {
        foreach ($cases->pluck('suite.project')->filter()->unique('id') as $project) {
            Gate::authorize('delete', $project);
        }
    }

    private function validateCase(Request $request): array
    {
        return $request->validate([
            'title'                         => ['required', 'string', 'max:255'],
            'template'                      => ['required', 'integer', 'in:1,2,3,4,5'],
            'type_id'                       => ['nullable', 'string', 'max:100'],
            'priority_id'                   => ['nullable', 'integer', 'in:1,2,3,4'],
            'section_id'                    => ['nullable', 'integer', 'exists:sections,id'],
            'estimate'                      => ['nullable', 'string', 'max:50'],
            'references'                    => ['nullable', 'string'],
            'preconditions'                 => ['nullable', 'string'],
            'body'                          => ['nullable', 'string'],
            'bdd_scenario'                  => ['nullable', 'string'],
            'checklist_items'               => ['nullable', 'array'],
            'checklist_items.*.label'       => ['required_with:checklist_items', 'string'],
            'checklist_items.*.is_optional' => ['boolean'],
            'steps'                         => ['nullable', 'array'],
            'steps.*.action'                => ['required_with:steps', 'string'],
            'steps.*.expected'              => ['nullable', 'string'],
            'steps.*.display_order'         => ['nullable', 'integer'],
            'requirement_ids'               => ['nullable', 'array'],
            'requirement_ids.*'             => ['integer', 'exists:requirements,id'],
            'assigned_to'                   => ['nullable', 'integer', 'exists:users,id'],
            'custom_values'                 => ['nullable', 'array'],
        ]);
    }

    private function mapAttributes(array $validated, array $extra = []): array
    {
        return array_merge([
            'title'           => $validated['title'],
            'template'        => self::TEMPLATE_MAP[$validated['template']],
            'case_type'       => $validated['type_id'] ?? null,
            'priority'        => isset($validated['priority_id'])
                ? (self::PRIORITY_MAP[$validated['priority_id']] ?? null)
                : null,
            'section_id'      => $validated['section_id'] ?? null,
            'estimate'        => self::parseEstimate($validated['estimate'] ?? null),
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
            'bdd'                  => $this->syncBdd($testCase, $request),
            'checklist'            => $this->syncChecklist($testCase, $request),
            default                => null,
        };
    }

    private function syncSteps(TestCase $testCase, Request $request): void
    {
        if (! $request->filled('steps')) {
            return;
        }
        foreach ($request->input('steps') as $index => $step) {
            $testCase->steps()->create([
                'content'     => $step['action'],
                'expected'    => $step['expected'] ?? null,
                'step_index'  => $step['display_order'] ?? ($index + 1),
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
                    'label'       => $item['label'],
                    'is_optional' => (bool) ($item['is_optional'] ?? false),
                ],
                $request->input('checklist_items'),
            );
        } elseif ($request->filled('steps')) {
            $items = array_map(
                fn (array $step): array => ['label' => $step['action'], 'is_optional' => false],
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
            $matched  = true;
        }
        if (preg_match('/(\d+)\s*m/i', $value, $m)) {
            $seconds += (int) $m[1] * 60;
            $matched  = true;
        }
        return $matched ? $seconds : null;
    }

    private function transformCase(TestCase $testCase): array
    {
        $templateInt = array_search($testCase->template, self::TEMPLATE_MAP, true);
        $priorityInt = array_search($testCase->priority, self::PRIORITY_MAP, true);

        // Build flat custom_values map: field_id => coerced scalar value
        $customValues = [];
        if ($testCase->relationLoaded('customValues')) {
            foreach ($testCase->customValues as $cv) {
                $field = $cv->customField;
                if (! $field) {
                    continue;
                }
                $customValues[$cv->custom_field_id] = match ($field->field_type) {
                    'integer'                         => $cv->value_integer,
                    'text', 'rich_text'               => $cv->value_text ?? '',
                    'checkbox'                        => $cv->value_boolean,
                    'multi_select', 'steps',
                    'step_results'                    => $cv->value_json ?? [],
                    default                           => $cv->value_string ?? '',
                };
            }
        }

        return [
            'id'              => $testCase->id,
            'suite_id'        => $testCase->suite_id,
            'section_id'      => $testCase->section_id,
            'section'         => $testCase->relationLoaded('section') ? $testCase->section : null,
            'title'           => $testCase->title,
            'template'        => $templateInt === false ? 2 : $templateInt,
            'type_id'         => $testCase->case_type,
            'priority_id'     => $priorityInt === false ? null : $priorityInt,
            'estimate'        => $testCase->estimate !== null ? self::formatEstimate($testCase->estimate) : null,
            'references'      => $testCase->refs,
            'preconditions'   => $testCase->preconditions,
            'body'            => $testCase->expected_result,
            'bdd_scenario'    => $testCase->bdd_scenario,
            'checklist_items' => $testCase->checklist_items,
            'steps'           => $testCase->relationLoaded('steps')
                ? $testCase->steps->map(fn ($step): array => [
                    'id'            => $step->id,
                    'test_case_id'  => $step->test_case_id,
                    'action'        => $step->content,
                    'expected'      => $step->expected,
                    'display_order' => $step->step_index,
                ])->all()
                : null,
            'requirements'    => $testCase->relationLoaded('requirements')
                ? $testCase->requirements->map(fn ($req): array => [
                    'id'         => $req->id,
                    'display_id' => $req->display_id,
                    'title'      => $req->title,
                    'priority'   => $req->priority,
                    'status'     => $req->status,
                ])->all()
                : null,
            'custom_values'   => $customValues,
            'created_at'      => $testCase->created_at,
            'updated_at'      => $testCase->updated_at,
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
        if ($h > 0) { $parts[] = "{$h}h"; }
        if ($m > 0) { $parts[] = "{$m}m"; }
        if ($s > 0) { $parts[] = "{$s}s"; }
        return implode(' ', $parts);
    }


    // ── History (stub) ─────────────────────────────────────────────────────────

    /**
     * Show version history for a test case.
     * Falls back to static stub data when no real history rows exist.
     */
    public function history(Request $request, TestCase $testCase): Response
    {
        Gate::authorize('view', $testCase->suite->project);

        $history = $testCase
            ->history()
            ->with('changedBy:id,name')
            ->latest('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($h) => [
                'id'               => $h->id,
                'changed_at'       => $h->created_at,
                'changed_by_name'  => $h->changedBy?->name ?? 'System',
                'change_note'      => $h->change_note,
                'changed_fields'   => $h->changed_fields ?? [],
                'snapshot'         => $h->snapshot ?? [],
            ]);

        return Inertia::render('test-cases/history', [
            'testCase' => [
                'id'    => $testCase->id,
                'title' => $testCase->title,
                'suite_id' => $testCase->suite_id,
            ],
            'history'  => $history,
            'suiteId'  => $testCase->suite_id,
        ]);
    }
}
