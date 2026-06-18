<?php

namespace App\Http\Controllers;

use App\Models\CustomField;
use App\Models\CustomFieldOption;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminCustomFieldController extends Controller
{
    private const FIELD_TYPES = [
        'string', 'integer', 'text', 'rich_text', 'url', 'checkbox',
        'dropdown', 'user', 'date', 'milestone',
        'steps', 'step_results', 'multi_select',
    ];

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->hasRole('admin'), 403);
    }

    private function renderPage(string $appliesTo, Request $request): Response
    {
        $this->authorizeAdmin($request);

        $fields = CustomField::query()
            ->where('applies_to', $appliesTo)
            ->with('options')
            ->orderBy('label')
            ->get()
            ->map(fn (CustomField $f) => [
                'id'          => $f->id,
                'system_name' => $f->system_name,
                'label'       => $f->label,
                'description' => $f->description,
                'field_type'  => $f->field_type,
                'applies_to'  => $f->applies_to,
                'is_global'   => $f->is_global,
                'options'     => $f->options->map(fn (CustomFieldOption $o) => [
                    'id'            => $o->id,
                    'option_key'    => $o->option_key,
                    'option_label'  => $o->option_label,
                    'display_order' => $o->display_order,
                ])->values(),
            ])
            ->values();

        $page = $appliesTo === 'cases'
            ? 'admin/customizations/case-fields'
            : 'admin/customizations/result-fields';

        return Inertia::render($page, [
            'fields'      => $fields,
            'field_types' => self::FIELD_TYPES,
        ]);
    }

    // ── Index ──────────────────────────────────────────────────────────────────

    public function caseFields(Request $request): Response
    {
        return $this->renderPage('cases', $request);
    }

    public function resultFields(Request $request): Response
    {
        return $this->renderPage('results', $request);
    }

    // ── Store ──────────────────────────────────────────────────────────────────

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'system_name' => ['required', 'string', 'max:64', 'regex:/^[a-z][a-z0-9_]*$/', 'unique:custom_fields,system_name'],
            'label'       => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'field_type'  => ['required', Rule::in(self::FIELD_TYPES)],
            'applies_to'  => ['required', Rule::in(['cases', 'results'])],
            'is_global'   => ['boolean'],
            'options'     => ['nullable', 'array'],
            'options.*.option_label' => ['required', 'string', 'max:120'],
        ]);

        $field = CustomField::create([
            'system_name' => $data['system_name'],
            'label'       => $data['label'],
            'description' => $data['description'] ?? null,
            'field_type'  => $data['field_type'],
            'applies_to'  => $data['applies_to'],
            'is_global'   => $data['is_global'] ?? false,
            'created_by'  => $request->user()->getKey(),
        ]);

        $this->syncOptions($field, $data['options'] ?? []);

        return back()->with('success', __('admin.custom_field_created'));
    }

    // ── Update ─────────────────────────────────────────────────────────────────

    public function update(Request $request, CustomField $customField): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'label'       => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_global'   => ['boolean'],
            'options'     => ['nullable', 'array'],
            'options.*.id'           => ['nullable', 'integer'],
            'options.*.option_label' => ['required', 'string', 'max:120'],
        ]);

        $customField->update([
            'label'       => $data['label'],
            'description' => $data['description'] ?? null,
            'is_global'   => $data['is_global'] ?? $customField->is_global,
        ]);

        $this->syncOptions($customField, $data['options'] ?? []);

        return back()->with('success', __('admin.custom_field_updated'));
    }

    // ── Destroy ────────────────────────────────────────────────────────────────

    public function destroy(Request $request, CustomField $customField): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $customField->delete();

        return back()->with('success', __('admin.custom_field_deleted'));
    }

    // ── Option sync ────────────────────────────────────────────────────────────

    /**
     * Sync options for dropdown / multi_select fields.
     *
     * @param  array<int, array{id?: int|null, option_label: string}>  $optionsData
     */
    private function syncOptions(CustomField $field, array $optionsData): void
    {
        if (! in_array($field->field_type, ['dropdown', 'multi_select'], true)) {
            $field->options()->delete();
            return;
        }

        $keepIds = [];

        foreach ($optionsData as $order => $item) {
            if (! empty($item['id'])) {
                $opt = CustomFieldOption::find($item['id']);
                if ($opt && $opt->custom_field_id === $field->id) {
                    $opt->update([
                        'option_label'  => $item['option_label'],
                        'display_order' => $order,
                    ]);
                    $keepIds[] = $opt->id;
                    continue;
                }
            }

            $opt = $field->options()->create([
                'option_key'    => $order + 1,
                'option_label'  => $item['option_label'],
                'display_order' => $order,
            ]);
            $keepIds[] = $opt->id;
        }

        $field->options()->whereNotIn('id', $keepIds)->delete();
    }
}
