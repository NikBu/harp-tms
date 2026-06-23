<?php

namespace Tests\Feature;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\Suite;
use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestPlan;
use App\Models\TestRun;
use App\Models\User;
use App\Policies\ProjectPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase as BaseTestCase;

/**
 * Comprehensive RBAC test suite for ProjectPolicy.
 *
 * Structure
 * ─────────
 * 1. Unit-level ability matrix   – every ability × every role, no HTTP
 * 2. Global admin bypass         – Gate::before fires before policy
 * 3. Non-member is denied        – authenticated but not in project
 * 4. Unauthenticated redirect    – guests hit /login
 * 5. HTTP smoke tests per module – one happy-path + one 403 per controller
 */
class ProjectPolicyTest extends BaseTestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function userWithRole(string $role): array
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();
        $project->members()->attach($user->id, ['role' => $role]);

        return [$user, $project];
    }

    private function globalAdmin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    /**
     * Evaluate a Gate ability via the policy directly (no HTTP).
     */
    private function can(User $user, string $ability, Project $project): bool
    {
        return Gate::forUser($user)->check($ability, $project);
    }

    // =========================================================================
    // 1. ABILITY MATRIX
    // =========================================================================

    // ————————————————————————— view —————————————————————————

    public function test_all_roles_can_view(): void
    {
        foreach (['viewer', 'tester', 'author', 'lead', 'project_admin'] as $role) {
            [$user, $project] = $this->userWithRole($role);
            $this->assertTrue($this->can($user, 'view', $project), "role=$role should be able to view");
        }
    }

    // ————————————————————————— edit —————————————————————————

    public function test_viewer_and_tester_cannot_edit(): void
    {
        foreach (['viewer', 'tester'] as $role) {
            [$user, $project] = $this->userWithRole($role);
            $this->assertFalse($this->can($user, 'edit', $project), "role=$role should NOT be able to edit");
        }
    }

    public function test_author_lead_admin_can_edit(): void
    {
        foreach (['author', 'lead', 'project_admin'] as $role) {
            [$user, $project] = $this->userWithRole($role);
            $this->assertTrue($this->can($user, 'edit', $project), "role=$role should be able to edit");
        }
    }

    // —————————————————————— submitResults ——————————————————————

    public function test_viewer_cannot_submit_results(): void
    {
        [$user, $project] = $this->userWithRole('viewer');
        $this->assertFalse($this->can($user, 'submitResults', $project));
    }

    public function test_tester_and_above_can_submit_results(): void
    {
        foreach (['tester', 'author', 'lead', 'project_admin'] as $role) {
            [$user, $project] = $this->userWithRole($role);
            $this->assertTrue($this->can($user, 'submitResults', $project), "role=$role should be able to submitResults");
        }
    }

    // —————————————————————— manageRuns ——————————————————————

    public function test_viewer_tester_author_cannot_manage_runs(): void
    {
        foreach (['viewer', 'tester', 'author'] as $role) {
            [$user, $project] = $this->userWithRole($role);
            $this->assertFalse($this->can($user, 'manageRuns', $project), "role=$role should NOT be able to manageRuns");
        }
    }

    public function test_lead_and_project_admin_can_manage_runs(): void
    {
        foreach (['lead', 'project_admin'] as $role) {
            [$user, $project] = $this->userWithRole($role);
            $this->assertTrue($this->can($user, 'manageRuns', $project), "role=$role should be able to manageRuns");
        }
    }

    // ———————————————————————— delete ————————————————————————

    public function test_only_project_admin_can_delete(): void
    {
        foreach (['viewer', 'tester', 'author', 'lead'] as $role) {
            [$user, $project] = $this->userWithRole($role);
            $this->assertFalse($this->can($user, 'delete', $project), "role=$role should NOT be able to delete");
        }

        [$user, $project] = $this->userWithRole('project_admin');
        $this->assertTrue($this->can($user, 'delete', $project));
    }

    // —————————————————————— manageMembers ——————————————————————

    public function test_only_project_admin_can_manage_members(): void
    {
        foreach (['viewer', 'tester', 'author', 'lead'] as $role) {
            [$user, $project] = $this->userWithRole($role);
            $this->assertFalse($this->can($user, 'manageMembers', $project), "role=$role should NOT manage members");
        }

        [$user, $project] = $this->userWithRole('project_admin');
        $this->assertTrue($this->can($user, 'manageMembers', $project));
    }

    // =========================================================================
    // 2. GLOBAL ADMIN BYPASS
    // =========================================================================

    public function test_global_admin_passes_all_abilities(): void
    {
        $admin = $this->globalAdmin();
        $project = Project::factory()->create(); // admin is NOT a member

        foreach (['view', 'edit', 'submitResults', 'manageRuns', 'delete', 'manageMembers'] as $ability) {
            $this->assertTrue(
                $this->can($admin, $ability, $project),
                "global admin should pass ability=$ability"
            );
        }
    }

    // =========================================================================
    // 3. NON-MEMBER DENIED
    // =========================================================================

    public function test_non_member_fails_all_abilities(): void
    {
        $outsider = User::factory()->create();
        $project = Project::factory()->create();

        foreach (['view', 'edit', 'submitResults', 'manageRuns', 'delete', 'manageMembers'] as $ability) {
            $this->assertFalse(
                $this->can($outsider, $ability, $project),
                "non-member should fail ability=$ability"
            );
        }
    }

    // =========================================================================
    // 4. UNAUTHENTICATED REDIRECT
    // =========================================================================

    public function test_guest_redirected_from_project_route(): void
    {
        $project = Project::factory()->create();
        $this->get("/projects/{$project->id}/milestones")->assertRedirect('/login');
    }

    public function test_guest_redirected_from_run_route(): void
    {
        $project = Project::factory()->create();
        $this->get("/projects/{$project->id}/runs")->assertRedirect('/login');
    }

    // =========================================================================
    // 5. HTTP SMOKE TESTS
    // Each section: one happy path (200/redirect) + one 403 for lower role
    // =========================================================================

    // ——————————————————————— Milestones ———————————————————————

    public function test_viewer_can_see_milestones_index(): void
    {
        [$user, $project] = $this->userWithRole('viewer');

        $this->actingAs($user)
            ->get("/projects/{$project->id}/milestones")
            ->assertOk();
    }

    public function test_viewer_cannot_create_milestone(): void
    {
        [$user, $project] = $this->userWithRole('viewer');

        $this->actingAs($user)
            ->post("/projects/{$project->id}/milestones", [
                'name' => 'Should Fail',
                'status' => 'upcoming',
            ])
            ->assertForbidden();
    }

    public function test_author_can_create_milestone(): void
    {
        [$user, $project] = $this->userWithRole('author');

        $this->actingAs($user)
            ->post("/projects/{$project->id}/milestones", [
                'name' => 'Author Milestone',
                'status' => 'upcoming',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('milestones', ['name' => 'Author Milestone']);
    }

    public function test_tester_cannot_delete_milestone(): void
    {
        [$owner, $project] = $this->userWithRole('project_admin');
        $tester = User::factory()->create();
        $project->members()->attach($tester->id, ['role' => 'tester']);
        $milestone = Milestone::factory()->create(['project_id' => $project->id]);

        $this->actingAs($tester)
            ->delete("/milestones/{$milestone->id}")
            ->assertForbidden();
    }

    public function test_project_admin_can_delete_milestone(): void
    {
        [$user, $project] = $this->userWithRole('project_admin');
        $milestone = Milestone::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->delete("/milestones/{$milestone->id}")
            ->assertRedirect();

        $this->assertModelMissing($milestone);
    }

    // ——————————————————————— Test Runs ———————————————————————

    public function test_viewer_can_see_runs_index(): void
    {
        [$user, $project] = $this->userWithRole('viewer');

        $this->actingAs($user)
            ->get("/projects/{$project->id}/runs")
            ->assertOk();
    }

    public function test_author_cannot_create_run(): void
    {
        // create run requires manageRuns (lead+)
        [$user, $project] = $this->userWithRole('author');
        $suite = Suite::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/runs", [
                'name' => 'Should Fail',
                'suite_id' => $suite->id,
                'include_all' => false,
            ])
            ->assertForbidden();
    }

    public function test_lead_can_create_run(): void
    {
        [$user, $project] = $this->userWithRole('lead');
        $suite = Suite::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/runs", [
                'name' => 'Lead Run',
                'suite_id' => $suite->id,
                'include_all' => false,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('test_runs', ['name' => 'Lead Run', 'project_id' => $project->id]);
    }

    public function test_tester_can_submit_result(): void
    {
        [$lead, $project] = $this->userWithRole('lead');
        $tester = User::factory()->create();
        $project->members()->attach($tester->id, ['role' => 'tester']);

        $suite = Suite::factory()->create(['project_id' => $project->id]);
        $case = TestCase::factory()->create(['suite_id' => $suite->id]);
        $run = TestRun::factory()->create(['project_id' => $project->id, 'suite_id' => $suite->id]);
        $test = Test::factory()->create(['run_id' => $run->id, 'case_id' => $case->id, 'status' => 'untested']);

        $this->actingAs($tester)
            ->post("/runs/{$run->id}/tests/{$test->id}/results", [
                'status' => 'passed',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('test_results', [
            'run_id' => $run->id,
            'case_id' => $case->id,
            'status' => 'passed',
        ]);
    }

    public function test_viewer_cannot_submit_result(): void
    {
        [$lead, $project] = $this->userWithRole('lead');
        $viewer = User::factory()->create();
        $project->members()->attach($viewer->id, ['role' => 'viewer']);

        $suite = Suite::factory()->create(['project_id' => $project->id]);
        $case = TestCase::factory()->create(['suite_id' => $suite->id]);
        $run = TestRun::factory()->create(['project_id' => $project->id, 'suite_id' => $suite->id]);
        $test = Test::factory()->create(['run_id' => $run->id, 'case_id' => $case->id, 'status' => 'untested']);

        $this->actingAs($viewer)
            ->post("/runs/{$run->id}/tests/{$test->id}/results", [
                'status' => 'passed',
            ])
            ->assertForbidden();
    }

    public function test_author_cannot_delete_run(): void
    {
        [$lead, $project] = $this->userWithRole('lead');
        $author = User::factory()->create();
        $project->members()->attach($author->id, ['role' => 'author']);
        $run = TestRun::factory()->create(['project_id' => $project->id]);

        $this->actingAs($author)
            ->delete("/runs/{$run->id}")
            ->assertForbidden();
    }

    public function test_project_admin_can_delete_run(): void
    {
        [$user, $project] = $this->userWithRole('project_admin');
        $run = TestRun::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->delete("/runs/{$run->id}")
            ->assertRedirect();

        $this->assertModelMissing($run);
    }

    // ——————————————————————— Test Plans ———————————————————————

    public function test_author_cannot_create_plan(): void
    {
        [$user, $project] = $this->userWithRole('author');

        $this->actingAs($user)
            ->post("/projects/{$project->id}/plans", [
                'name' => 'Blocked Plan',
            ])
            ->assertForbidden();
    }

    public function test_lead_can_create_plan(): void
    {
        [$user, $project] = $this->userWithRole('lead');

        $this->actingAs($user)
            ->post("/projects/{$project->id}/plans", [
                'name' => 'Lead Plan',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('test_plans', ['name' => 'Lead Plan', 'project_id' => $project->id]);
    }

    public function test_lead_cannot_delete_plan(): void
    {
        [$lead, $project] = $this->userWithRole('lead');
        $plan = TestPlan::factory()->create(['project_id' => $project->id]);

        $this->actingAs($lead)
            ->delete("/plans/{$plan->id}")
            ->assertForbidden();
    }

    public function test_project_admin_can_delete_plan(): void
    {
        [$user, $project] = $this->userWithRole('project_admin');
        $plan = TestPlan::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->delete("/plans/{$plan->id}")
            ->assertRedirect();

        $this->assertModelMissing($plan);
    }

    // ——————————————————————— Suites ———————————————————————

    public function test_viewer_cannot_create_suite(): void
    {
        [$user, $project] = $this->userWithRole('viewer');

        $this->actingAs($user)
            ->post("/projects/{$project->id}/suites", ['name' => 'Blocked Suite'])
            ->assertForbidden();
    }

    public function test_author_can_create_suite(): void
    {
        [$user, $project] = $this->userWithRole('author');
        // ensure multi-suite mode so cap is not hit
        $project->update(['suite_mode' => 3]);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/suites", ['name' => 'Author Suite'])
            ->assertRedirect();

        $this->assertDatabaseHas('suites', ['name' => 'Author Suite', 'project_id' => $project->id]);
    }

    public function test_tester_cannot_delete_suite(): void
    {
        [$owner, $project] = $this->userWithRole('project_admin');
        $tester = User::factory()->create();
        $project->members()->attach($tester->id, ['role' => 'tester']);
        $suite = Suite::factory()->create(['project_id' => $project->id]);

        $this->actingAs($tester)
            ->delete("/suites/{$suite->id}")
            ->assertForbidden();
    }

    // ——————————————————————— Integrations ———————————————————————

    public function test_viewer_can_see_integrations_index(): void
    {
        [$user, $project] = $this->userWithRole('viewer');

        $this->actingAs($user)
            ->get("/projects/{$project->id}/integrations")
            ->assertOk();
    }

    public function test_viewer_cannot_store_integration(): void
    {
        [$user, $project] = $this->userWithRole('viewer');

        $this->actingAs($user)
            ->post("/projects/{$project->id}/integrations", [
                'integration_type' => 'jira',
                'is_active' => true,
            ])
            ->assertForbidden();
    }

    public function test_author_can_store_integration(): void
    {
        [$user, $project] = $this->userWithRole('author');

        $this->actingAs($user)
            ->post("/projects/{$project->id}/integrations", [
                'integration_type' => 'jira',
                'name' => 'My Jira',
                'config' => ['base_url' => 'https://example.atlassian.net'],
                'is_active' => false,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('integrations', [
            'project_id' => $project->id,
            'integration_type' => 'jira',
        ]);
    }

    // ——————————————————————— Project Defects ———————————————————————

    public function test_viewer_can_see_project_defects(): void
    {
        [$user, $project] = $this->userWithRole('viewer');

        $this->actingAs($user)
            ->get("/projects/{$project->id}/defects")
            ->assertOk();
    }

    public function test_non_member_cannot_see_project_defects(): void
    {
        $outsider = User::factory()->create();
        $project = Project::factory()->create();

        $this->actingAs($outsider)
            ->get("/projects/{$project->id}/defects")
            ->assertForbidden();
    }

    // ——————————————————————— Global admin HTTP bypass ———————————————————————

    public function test_global_admin_can_view_any_project(): void
    {
        $admin = $this->globalAdmin();
        $project = Project::factory()->create(); // admin is NOT a member

        $this->actingAs($admin)
            ->get("/projects/{$project->id}/milestones")
            ->assertOk();
    }

    public function test_global_admin_can_delete_any_milestone(): void
    {
        $admin = $this->globalAdmin();
        $project = Project::factory()->create();
        $milestone = Milestone::factory()->create(['project_id' => $project->id]);

        $this->actingAs($admin)
            ->delete("/milestones/{$milestone->id}")
            ->assertRedirect();

        $this->assertModelMissing($milestone);
    }
}
