<?php

namespace App\Http\Controllers;

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

        return Inertia::render('projects/settings', [
            'project'   => $project,
            'available' => $available,
            'roles'     => ['viewer', 'tester', 'author', 'lead', 'project_admin'],
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

        // Cannot remove yourself (use "Leave project" flow instead — not in scope here)
        abort_if($user->id === $request->user()->id, 422, __('settings.remove_self_error'));

        $project->members()->detach($user->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('settings.member_removed')]);

        return back();
    }
}