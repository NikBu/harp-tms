<?php

namespace Tests\Feature;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\TestPlan;
use App\Models\TestPlanEntry;
use App\Models\TestRun;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TestPlanTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(User $admin): Project
    {
        $project = Project::factory()->create();
        $project->members()->attach($admin->id, ['role' => 'project_admin']);
        return $project;
    }

    // ── Index ──────────────────────────────────────────────────────────────

    public function test_member_can_list_plans(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        TestPlan::factory(2)->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->get("/projects/{$project->id}/plans")
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->component('plans/index')
                ->has('plans.data', 2)
            );
    }

    public function test_non_member_cannot_list_plans(): void
    {
        $project = Project::factory()->create();
        $other   = User::factory()->create();

        $this->actingAs($other)
            ->get("/projects/{$project->id}/plans")
            ->assertForbidden();
    }

    // ── Create / Store ─────────────────────────────────────────────────────

    public function test_store_creates_plan(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/plans", [
                'name'   => 'Sprint 1 Plan',
                'end_on' => '2026-12-31',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('test_plans', [
            'name'       => 'Sprint 1 Plan',
            'project_id' => $project->id,
            'created_by' => $user->id,
        ]);
    }

    public function test_store_requires_name(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/plans", ['name' => ''])
            ->assertSessionHasErrors('name');
    }

    public function test_end_date_must_not_be_before_start_date(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/plans", [
                'name'     => 'Bad Dates',
                'start_on' => '2026-06-30',
                'end_on'   => '2026-06-01',
            ])
            ->assertSessionHasErrors('end_on');
    }

    // ── Show ───────────────────────────────────────────────────────────────

    public function test_member_can_view_plan(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $plan    = TestPlan::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->get("/plans/{$plan->id}")
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->component('plans/show')
                ->where('plan.id', $plan->id)
            );
    }

    // ── Update ─────────────────────────────────────────────────────────────

    public function test_member_can_update_plan(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $plan    = TestPlan::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->put("/plans/{$plan->id}", ['name' => 'Updated Plan'])
            ->assertRedirect();

        $this->assertSame('Updated Plan', $plan->fresh()->name);
    }

    // ── Close / Reopen ─────────────────────────────────────────────────────

    public function test_member_can_close_plan(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $plan    = TestPlan::factory()->create(['project_id' => $project->id, 'is_completed' => false]);

        $this->actingAs($user)
            ->patch("/plans/{$plan->id}/close")
            ->assertRedirect();

        $plan->refresh();
        $this->assertTrue($plan->is_completed);
        $this->assertNotNull($plan->completed_at);
    }

    public function test_closing_already_closed_plan_returns_422(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $plan    = TestPlan::factory()->create(['project_id' => $project->id, 'is_completed' => true]);

        $this->actingAs($user)
            ->patch("/plans/{$plan->id}/close")
            ->assertStatus(422);
    }

    public function test_member_can_reopen_plan(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $plan    = TestPlan::factory()->create([
            'project_id'   => $project->id,
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch("/plans/{$plan->id}/reopen")
            ->assertRedirect();

        $plan->refresh();
        $this->assertFalse($plan->is_completed);
        $this->assertNull($plan->completed_at);
    }

    // ── Entries ────────────────────────────────────────────────────────────

    public function test_member_can_add_run_entry(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $plan    = TestPlan::factory()->create(['project_id' => $project->id]);
        $run     = TestRun::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->post("/plans/{$plan->id}/entries", ['run_id' => $run->id])
            ->assertRedirect();

        $this->assertDatabaseHas('test_plan_entries', [
            'plan_id' => $plan->id,
            'run_id'  => $run->id,
        ]);

        // plan_id stamped back onto the run
        $this->assertSame($plan->id, $run->fresh()->plan_id);
    }

    public function test_cannot_add_duplicate_run_entry(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $plan    = TestPlan::factory()->create(['project_id' => $project->id]);
        $run     = TestRun::factory()->create(['project_id' => $project->id]);

        TestPlanEntry::factory()->create(['plan_id' => $plan->id, 'run_id' => $run->id]);

        $this->actingAs($user)
            ->post("/plans/{$plan->id}/entries", ['run_id' => $run->id])
            ->assertStatus(422);
    }

    public function test_cannot_add_entry_to_closed_plan(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $plan    = TestPlan::factory()->create(['project_id' => $project->id, 'is_completed' => true]);
        $run     = TestRun::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->post("/plans/{$plan->id}/entries", ['run_id' => $run->id])
            ->assertStatus(422);
    }

    public function test_cannot_add_run_from_different_project(): void
    {
        $user         = User::factory()->create();
        $project      = $this->makeProject($user);
        $otherProject = Project::factory()->create();
        $plan         = TestPlan::factory()->create(['project_id' => $project->id]);
        $foreignRun   = TestRun::factory()->create(['project_id' => $otherProject->id]);

        $this->actingAs($user)
            ->post("/plans/{$plan->id}/entries", ['run_id' => $foreignRun->id])
            ->assertStatus(422);
    }

    public function test_member_can_remove_entry(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $plan    = TestPlan::factory()->create(['project_id' => $project->id]);
        $run     = TestRun::factory()->create(['project_id' => $project->id, 'plan_id' => $plan->id]);
        $entry   = TestPlanEntry::factory()->create(['plan_id' => $plan->id, 'run_id' => $run->id]);

        $this->actingAs($user)
            ->delete("/plans/{$plan->id}/entries/{$entry->id}")
            ->assertRedirect();

        $this->assertModelMissing($entry);
        $this->assertNull($run->fresh()->plan_id);
    }

    // ── Delete ─────────────────────────────────────────────────────────────

    public function test_project_admin_can_delete_plan(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $plan    = TestPlan::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->delete("/plans/{$plan->id}")
            ->assertRedirect();

        $this->assertModelMissing($plan);
    }

    public function test_regular_member_cannot_delete_plan(): void
    {
        $owner   = User::factory()->create();
        $member  = User::factory()->create();
        $project = Project::factory()->create();
        $project->members()->attach($owner->id,  ['role' => 'project_admin']);
        $project->members()->attach($member->id, ['role' => 'tester']);
        $plan = TestPlan::factory()->create(['project_id' => $project->id]);

        $this->actingAs($member)
            ->delete("/plans/{$plan->id}")
            ->assertForbidden();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $plan = TestPlan::factory()->create();

        $this->get("/plans/{$plan->id}")->assertRedirect('/login');
    }
}