<?php

namespace Tests\Feature;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MilestoneTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(User $admin): Project
    {
        $project = Project::factory()->create();
        $project->members()->attach($admin->id, ['role' => 'project_admin']);

        return $project;
    }

    // ── Index ──────────────────────────────────────────────────────────────

    public function test_member_can_list_milestones(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        Milestone::factory(3)->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->get("/projects/{$project->id}/milestones")
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->component('milestones/index')
                ->has('milestones', 3)
            );
    }

    public function test_non_member_cannot_list_milestones(): void
    {
        $project = Project::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($other)
            ->get("/projects/{$project->id}/milestones")
            ->assertForbidden();
    }

    // ── Create / Store ─────────────────────────────────────────────────────

    public function test_store_creates_milestone(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/milestones", [
                'name' => 'v1.0 Release',
                'status' => 'upcoming',
                'due_on' => '2026-12-31',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('milestones', [
            'name' => 'v1.0 Release',
            'project_id' => $project->id,
            'due_on' => '2026-12-31',
            'created_by' => $user->id,
        ]);
    }

    public function test_store_requires_name(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/milestones", ['name' => '', 'status' => 'upcoming'])
            ->assertSessionHasErrors('name');
    }

    public function test_due_date_must_not_be_before_start_date(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/milestones", [
                'name' => 'Bad Dates',
                'status' => 'upcoming',
                'start_on' => '2026-06-30',
                'due_on' => '2026-06-01',
            ])
            ->assertSessionHasErrors('due_on');
    }

    public function test_store_supports_parent_milestone(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $parent = Milestone::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/milestones", [
                'name' => 'Sub-milestone',
                'status' => 'upcoming',
                'parent_id' => $parent->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('milestones', [
            'name' => 'Sub-milestone',
            'parent_id' => $parent->id,
        ]);
    }

    // ── Show ───────────────────────────────────────────────────────────────

    public function test_member_can_view_milestone(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $milestone = Milestone::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->get("/milestones/{$milestone->id}")
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->component('milestones/show')
                ->where('milestone.id', $milestone->id)
            );
    }

    // ── Edit / Update ──────────────────────────────────────────────────────

    public function test_member_can_update_milestone(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $milestone = Milestone::factory()->create(['project_id' => $project->id, 'name' => 'Old Name']);

        $this->actingAs($user)
            ->put("/milestones/{$milestone->id}", [
                'name' => 'New Name',
                'status' => 'active',
            ])
            ->assertRedirect();

        $this->assertSame('New Name', $milestone->fresh()->name);
        $this->assertSame('active', $milestone->fresh()->status);
    }

    // ── Complete / Reopen ──────────────────────────────────────────────────

    public function test_member_can_complete_milestone(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $milestone = Milestone::factory()->create(['project_id' => $project->id, 'is_completed' => false]);

        $this->actingAs($user)
            ->patch("/milestones/{$milestone->id}/complete")
            ->assertRedirect();

        $milestone->refresh();
        $this->assertTrue($milestone->is_completed);
        $this->assertSame('completed', $milestone->status);
        $this->assertNotNull($milestone->completed_at);
    }

    public function test_completing_already_completed_milestone_returns_422(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $milestone = Milestone::factory()->create(['project_id' => $project->id, 'is_completed' => true]);

        $this->actingAs($user)
            ->patch("/milestones/{$milestone->id}/complete")
            ->assertStatus(422);
    }

    public function test_member_can_reopen_milestone(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $milestone = Milestone::factory()->create([
            'project_id' => $project->id,
            'is_completed' => true,
            'completed_at' => now(),
            'status' => 'completed',
        ]);

        $this->actingAs($user)
            ->patch("/milestones/{$milestone->id}/reopen")
            ->assertRedirect();

        $milestone->refresh();
        $this->assertFalse($milestone->is_completed);
        $this->assertSame('active', $milestone->status);
        $this->assertNull($milestone->completed_at);
    }

    // ── Delete ─────────────────────────────────────────────────────────────

    public function test_project_admin_can_delete_milestone(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $milestone = Milestone::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->delete("/milestones/{$milestone->id}")
            ->assertRedirect();

        $this->assertModelMissing($milestone);
    }

    public function test_regular_member_cannot_delete_milestone(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->create();
        $project->members()->attach($owner->id, ['role' => 'project_admin']);
        $project->members()->attach($member->id, ['role' => 'tester']);
        $milestone = Milestone::factory()->create(['project_id' => $project->id]);

        $this->actingAs($member)
            ->delete("/milestones/{$milestone->id}")
            ->assertForbidden();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $milestone = Milestone::factory()->create();

        $this->get("/milestones/{$milestone->id}")->assertRedirect('/login');
    }
}
