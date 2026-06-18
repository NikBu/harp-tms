<?php

namespace App\Http\Controllers;

use App\Models\CustomField;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectSettingsController extends Controller
{
    // -------------------------------------------------------------------------
    // Gate: only project_admin (or global admin) may touch settings
    // -------------------------------------------------------------------------

    private function authorizeAdmin(Request $request, Project $project): void
    {
        $user = $request->user();

        if ($user->hasRole('admin')) {
            return;
        }

        $isProjectAdmin = $project->members()
            ->whereKey($user->getKey())
            ->wherePivot('role', 'project_admin')
            ->exists();

        abort_unless($isProjectAdmin, 403);
    }

    // -------------------------------------------------------------------------
    // Show settings page
    // -------------------------------------------------------------------------

    public function show(Request $request, Project $project): Response
    {
        $this->authorizeAdmin($request, $project);

        $project->load(['members' => function ($q) {
            $q->orderByPivot('role')->orderBy('name');
        }, 'createdBy:id,name']);

        // All users not yet in this project — for the "Add member" dropdown
        $existingIds = $project->members->pluck('id');
        $available   = User::whereNotIn('id', $existingIds)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        // All custom fields (global + per-project), with pivot data for this project
        $allFields = CustomField::query()
            ->with(['options', 'projects' => fn ($q) => $q->where('projects.id', $project->id)])
            ->orderBy('applies_to')
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
                // Pivot data if this field is explicitly assigned to this project
                'pivot'       => $f->projects->first()
                    ? [
                        'is_required'   => (bool) $f->projects->first()->pivot->is_required,
                        'display_order' => (int)  $f->projects->first()->pivot->display_order,
                        'default_value' => $f->projects->first()->pivot->default_value,
                    ]
                    : null,
            ])
            ->values();

        return Inertia::render('projects/settings', [
            'project'    => $project,
            'available'  => $available,
            'roles'      => ['viewer', 'tester', 'author', 'lead', 'project_admin'],
            'allFields'  => $allFields,
        ]);
    }

    // -------------------------------------------------------------------------
    // General tab
    // -------------------------------------------------------------------------

    public function updateGeneral(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeAdmin($request, $project);

        $validated = $request->validate([
            'name'              => ['required', 'string', 'max:255'],
            'description'       => ['nullable', 'string'],
            'announcement'      => ['nullable', 'string'],
            'show_announcement' => ['boolean'],
        ]);

        $project->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('settings.saved')]);

        return back();
    }

    // -------------------------------------------------------------------------
    // Members tab
    // -------------------------------------------------------------------------

    public function addMember(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeAdmin($request, $project);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role'    => ['required', 'string', Rule::in(['viewer', 'tester', 'author', 'lead', 'project_admin'])],
        ]);

        // Idempotent: if already a member just update their role
        $project->members()->syncWithoutDetaching([
            $validated['user_id'] => ['role' => $validated['role']],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('settings.member_added')]);

        return back();
    }

    public function updateMemberRole(Request $request, Project $project, User $user): RedirectResponse
    {
        $this->authorizeAdmin($request, $project);

        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(['viewer', 'tester', 'author', 'lead', 'project_admin'])],
        ]);

        // Prevent removing the last project_admin
        if ($validated['role'] !== 'project_admin') {
            $adminCount = $project->members()
                ->wherePivot('role', 'project_admin')
                ->whereKey($user->getKey())
                ->exists();

            if ($adminCount) {
                $remaining = $project->members()
                    ->wherePivot('role', 'project_admin')
                    ->count();

                abort_if($remaining <= 1, 422, __('settings.last_admin_error'));
            }
        }

        $project->members()->updateExistingPivot($user->id, ['role' => $validated['role']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('settings.role_updated')]);

        return back();
    }

    public function removeMember(Request $request, Project $project, User $user): RedirectResponse
    {
        $this->authorizeAdmin($request, $project);

        // Cannot remove last admin
        $isAdmin = $project->members()
            ->whereKey($user->getKey())
            ->wherePivot('role', 'project_admin')
            ->exists();

        if ($isAdmin) {
            $adminCount = $project->members()->wherePivot('role', 'project_admin')->count();
            abort_if($adminCount <= 1, 422, __('settings.last_admin_error'));
        }

        // Cannot remove yourself (use "Leave project" flow instead)
        abort_if($user->id === $request->user()->id, 422, __('settings.remove_self_error'));

        $project->members()->detach($user->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('settings.member_removed')]);

        return back();
    }

    // -------------------------------------------------------------------------
    // Custom Fields tab
    // -------------------------------------------------------------------------

    /**
     * Assign (or update pivot data for) a custom field on this project.
     * Body: { custom_field_id, is_required?, display_order?, default_value? }
     */
    public function syncProjectField(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeAdmin($request, $project);

        $validated = $request->validate([
            'custom_field_id' => ['required', 'integer', 'exists:custom_fields,id'],
            'is_required'     => ['boolean'],
            'display_order'   => ['integer', 'min:0'],
            'default_value'   => ['nullable', 'string', 'max:255'],
        ]);

        $project->customFields()->syncWithoutDetaching([
            $validated['custom_field_id'] => [
                'is_required'   => $validated['is_required']   ?? false,
                'display_order' => $validated['display_order'] ?? 0,
                'default_value' => $validated['default_value'] ?? null,
            ],
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('settings.field_assigned')]);

        return back();
    }

    /**
     * Remove a non-global custom field assignment from this project.
     */
    public function removeProjectField(Request $request, Project $project, CustomField $customField): RedirectResponse
    {
        $this->authorizeAdmin($request, $project);

        // Prevent removing a global field — those are always active
        abort_if($customField->is_global, 422, __('settings.cannot_remove_global_field'));

        $project->customFields()->detach($customField->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('settings.field_removed')]);

        return back();
    }

    /**
     * Update display_order and is_required for all fields assigned to this project.
     * Body: { fields: [{ custom_field_id, display_order, is_required, default_value }] }
     */
    public function reorderProjectFields(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeAdmin($request, $project);

        $validated = $request->validate([
            'fields'                   => ['required', 'array'],
            'fields.*.custom_field_id' => ['required', 'integer', 'exists:custom_fields,id'],
            'fields.*.display_order'   => ['required', 'integer', 'min:0'],
            'fields.*.is_required'     => ['boolean'],
            'fields.*.default_value'   => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($validated['fields'] as $row) {
            $project->customFields()->syncWithoutDetaching([
                $row['custom_field_id'] => [
                    'display_order' => $row['display_order'],
                    'is_required'   => $row['is_required'] ?? false,
                    'default_value' => $row['default_value'] ?? null,
                ],
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('settings.saved')]);

        return back();
    }
}
