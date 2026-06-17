<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

/**
 * Project-scoped RBAC policy.
 *
 * Roles (stored in project_user.role pivot):
 *   viewer        – read-only
 *   tester        – view + submit results
 *   author        – view + create/edit cases, requirements, milestones
 *   lead          – author + create/edit runs & plans, close/reopen
 *   project_admin – full control within project
 *
 * Global 'admin' role bypasses all checks via Gate::before (see AppServiceProvider).
 */
class ProjectPolicy
{
    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Return the pivot role for the user in the given project, or null if not a member.
     */
    private function role(User $user, Project $project): ?string
    {
        /** @var \Illuminate\Database\Eloquent\Relations\BelongsToMany $rel */
        $rel = $project->members()->whereKey($user->getKey());

        return $rel->first()?->pivot?->role;
    }

    private function isMember(User $user, Project $project): bool
    {
        return $this->role($user, $project) !== null;
    }

    private function hasRole(User $user, Project $project, string ...$roles): bool
    {
        return in_array($this->role($user, $project), $roles, true);
    }

    // -------------------------------------------------------------------------
    // Abilities
    // -------------------------------------------------------------------------

    /**
     * Any project member may view project data.
     */
    public function view(User $user, Project $project): bool
    {
        return $this->isMember($user, $project);
    }

    /**
     * Alias so `authorize('view', $project)` and `authorize('viewProject', $project)` both work.
     */
    public function viewProject(User $user, Project $project): bool
    {
        return $this->view($user, $project);
    }

    /**
     * Authors, leads, and project admins may create/edit non-destructive resources
     * (test cases, requirements, milestones, suites, integrations, defect links).
     */
    public function edit(User $user, Project $project): bool
    {
        return $this->hasRole($user, $project, 'author', 'lead', 'project_admin');
    }

    /**
     * Testers, authors, leads, and project admins may submit test results.
     */
    public function submitResults(User $user, Project $project): bool
    {
        return $this->hasRole($user, $project, 'tester', 'author', 'lead', 'project_admin');
    }

    /**
     * Leads and project admins may create/edit/close test runs and test plans.
     */
    public function manageRuns(User $user, Project $project): bool
    {
        return $this->hasRole($user, $project, 'lead', 'project_admin');
    }

    /**
     * Only project admins may delete any project-scoped resource.
     */
    public function delete(User $user, Project $project): bool
    {
        return $this->hasRole($user, $project, 'project_admin');
    }

    /**
     * Only project admins may manage project settings and members.
     */
    public function manageMembers(User $user, Project $project): bool
    {
        return $this->hasRole($user, $project, 'project_admin');
    }
}
