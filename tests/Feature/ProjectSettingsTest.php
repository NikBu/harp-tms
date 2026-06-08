<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(User $admin): Project
    {
        $project = Project::factory()->create();
        $project->members()->attach($admin->id, ['role' => 'project_admin']);
        return $project;
    }

    // ── Access ─────────────────────────────────────────────────────────────

    public function test_project_admin_can_view_settings(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->get("/projects/{$project->id}/settings")
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('projects/settings'));
    }

    public function test_non_admin_member_cannot_view_settings(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->create();
        $project->members()->attach($owner->id,  ['role' => 'project_admin']);
        $project->members()->attach($member->id, ['role' => 'tester']);

        $this->actingAs($member)
            ->get("/projects/{$project->id}/settings")
            ->assertForbidden();
    }

    public function test_non_member_cannot_view_settings(): void
    {
        $project = Project::factory()->create();
        $other   = User::factory()->create();

        $this->actingAs($other)
            ->get("/projects/{$project->id}/settings")
            ->assertForbidden();
    }

    // ── General ────────────────────────────────────────────────────────────

    public function test_admin_can_update_general_settings(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->patch("/projects/{$project->id}/settings/general", [
                'name'              => 'Renamed Project',
                'description'       => 'New desc',
                'show_announcement' => false,
            ])
            ->assertRedirect();

        $this->assertSame('Renamed Project', $project->fresh()->name);
    }

    public function test_general_settings_requires_name(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->patch("/projects/{$project->id}/settings/general", ['name' => ''])
            ->assertSessionHasErrors('name');
    }

    // ── Members ────────────────────────────────────────────────────────────

    public function test_admin_can_add_member(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $newUser = User::factory()->create();

        $this->actingAs($user)
            ->patch("/projects/{$project->id}/settings/members", [
                'user_id' => $newUser->id,
                'role'    => 'tester',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('project_user', [
            'project_id' => $project->id,
            'user_id'    => $newUser->id,
            'role'       => 'tester',
        ]);
    }

    public function test_admin_can_change_member_role(): void
    {
        $admin  = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->create();
        $project->members()->attach($admin->id,  ['role' => 'project_admin']);
        $project->members()->attach($member->id, ['role' => 'tester']);

        $this->actingAs($admin)
            ->patch("/projects/{$project->id}/settings/members/{$member->id}/role", [
                'role' => 'lead',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('project_user', [
            'project_id' => $project->id,
            'user_id'    => $member->id,
            'role'       => 'lead',
        ]);
    }

    public function test_cannot_demote_last_admin(): void
    {
        $admin   = User::factory()->create();
        $project = $this->makeProject($admin);

        $this->actingAs($admin)
            ->patch("/projects/{$project->id}/settings/members/{$admin->id}/role", [
                'role' => 'tester',
            ])
            ->assertStatus(422);
    }

    public function test_admin_can_remove_member(): void
    {
        $admin  = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->create();
        $project->members()->attach($admin->id,  ['role' => 'project_admin']);
        $project->members()->attach($member->id, ['role' => 'tester']);

        $this->actingAs($admin)
            ->delete("/projects/{$project->id}/settings/members/{$member->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('project_user', [
            'project_id' => $project->id,
            'user_id'    => $member->id,
        ]);
    }

    public function test_cannot_remove_last_admin(): void
    {
        $admin   = User::factory()->create();
        $project = $this->makeProject($admin);
        // Add a second non-admin so admin isn't the only member
        $member = User::factory()->create();
        $project->members()->attach($member->id, ['role' => 'tester']);

        $this->actingAs($admin)
            ->delete("/projects/{$project->id}/settings/members/{$admin->id}")
            ->assertStatus(422);
    }

    public function test_cannot_remove_self(): void
    {
        $admin1 = User::factory()->create();
        $admin2 = User::factory()->create();
        $project = Project::factory()->create();
        $project->members()->attach($admin1->id, ['role' => 'project_admin']);
        $project->members()->attach($admin2->id, ['role' => 'project_admin']);

        // admin1 tries to remove themselves
        $this->actingAs($admin1)
            ->delete("/projects/{$project->id}/settings/members/{$admin1->id}")
            ->assertStatus(422);
    }

    public function test_role_must_be_valid(): void
    {
        $admin  = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->create();
        $project->members()->attach($admin->id,  ['role' => 'project_admin']);
        $project->members()->attach($member->id, ['role' => 'tester']);

        $this->actingAs($admin)
            ->patch("/projects/{$project->id}/settings/members/{$member->id}/role", [
                'role' => 'super_owner',
            ])
            ->assertSessionHasErrors('role');
    }
}