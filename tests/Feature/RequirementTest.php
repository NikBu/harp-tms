<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Requirement;
use App\Models\RequirementFolder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RequirementTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(User $admin): Project
    {
        $project = Project::factory()->create();
        $project->members()->attach($admin->id, ['role' => 'project_admin']);

        return $project;
    }

    // ── Index ──────────────────────────────────────────────────────────────

    public function test_member_can_list_requirements(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        Requirement::factory(3)->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->get("/projects/{$project->id}/requirements")
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->component('requirements/index')
                ->has('requirements', 3)
                ->has('folders')
            );
    }

    public function test_non_member_cannot_list_requirements(): void
    {
        $project = Project::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($other)
            ->get("/projects/{$project->id}/requirements")
            ->assertForbidden();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $project = Project::factory()->create();

        $this->get("/projects/{$project->id}/requirements")
            ->assertRedirect('/login');
    }

    // ── Create / Store ─────────────────────────────────────────────────────

    public function test_store_creates_requirement(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/requirements", [
                'title' => 'User can log in',
                'type' => 'functional',
                'priority' => 'high',
                'status' => 'draft',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('requirements', [
            'title' => 'User can log in',
            'project_id' => $project->id,
            'type' => 'functional',
            'priority' => 'high',
            'status' => 'draft',
            'source' => 'manual',
            'created_by' => $user->id,
        ]);
    }

    public function test_store_generates_display_id(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/requirements", [
                'title' => 'First requirement',
                'status' => 'draft',
            ])
            ->assertRedirect();

        $req = Requirement::where('project_id', $project->id)->sole();
        $this->assertStringStartsWith('REQ-'.$project->id.'-', $req->display_id);
    }

    public function test_store_requires_title(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/requirements", ['title' => ''])
            ->assertSessionHasErrors('title');
    }

    public function test_store_rejects_invalid_type(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/requirements", [
                'title' => 'Valid title',
                'type' => 'not_a_real_type',
            ])
            ->assertSessionHasErrors('type');
    }

    public function test_store_splits_tag_string_into_array(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/requirements", [
                'title' => 'Tagged requirement',
                'status' => 'draft',
                'tags' => 'auth, login , security',
            ])
            ->assertRedirect();

        $req = Requirement::where('project_id', $project->id)->sole();
        $this->assertSame(['auth', 'login', 'security'], $req->tags);
    }

    public function test_store_with_folder(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $folder = RequirementFolder::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/requirements", [
                'title' => 'In a folder',
                'status' => 'draft',
                'folder_id' => $folder->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('requirements', [
            'title' => 'In a folder',
            'folder_id' => $folder->id,
        ]);
    }

    public function test_non_member_cannot_create_requirement(): void
    {
        $project = Project::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($other)
            ->post("/projects/{$project->id}/requirements", [
                'title' => 'Should be blocked',
                'status' => 'draft',
            ])
            ->assertForbidden();
    }

    // ── Show ───────────────────────────────────────────────────────────────

    public function test_member_can_view_requirement(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $req = Requirement::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->get("/requirements/{$req->id}")
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->component('requirements/show')
                ->where('requirement.id', $req->id)
            );
    }

    public function test_non_member_cannot_view_requirement(): void
    {
        $req = Requirement::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($other)
            ->get("/requirements/{$req->id}")
            ->assertForbidden();
    }

    // ── Edit / Update ──────────────────────────────────────────────────────

    public function test_member_can_update_requirement(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $req = Requirement::factory()->create([
            'project_id' => $project->id,
            'title' => 'Old Title',
            'status' => 'draft',
        ]);

        $this->actingAs($user)
            ->patch("/requirements/{$req->id}", [
                'title' => 'New Title',
                'status' => 'approved',
            ])
            ->assertRedirect();

        $req->refresh();
        $this->assertSame('New Title', $req->title);
        $this->assertSame('approved', $req->status);
        $this->assertSame($user->id, $req->updated_by);
    }

    public function test_update_splits_tag_string_into_array(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $req = Requirement::factory()->create([
            'project_id' => $project->id,
            'tags' => ['old'],
        ]);

        $this->actingAs($user)
            ->patch("/requirements/{$req->id}", [
                'title' => $req->title,
                'status' => 'draft',
                'tags' => 'api , v2, security ',
            ])
            ->assertRedirect();

        $this->assertSame(['api', 'v2', 'security'], $req->fresh()->tags);
    }

    public function test_update_with_empty_tags_stores_null(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $req = Requirement::factory()->create([
            'project_id' => $project->id,
            'tags' => ['existing'],
        ]);

        $this->actingAs($user)
            ->patch("/requirements/{$req->id}", [
                'title' => $req->title,
                'status' => 'draft',
                'tags' => '',
            ])
            ->assertRedirect();

        $this->assertNull($req->fresh()->tags);
    }

    public function test_non_member_cannot_update_requirement(): void
    {
        $req = Requirement::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($other)
            ->patch("/requirements/{$req->id}", ['title' => 'Hacked'])
            ->assertForbidden();
    }

    // ── Delete ─────────────────────────────────────────────────────────────

    public function test_project_admin_can_delete_requirement(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $req = Requirement::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->delete("/requirements/{$req->id}")
            ->assertRedirect();

        $this->assertModelMissing($req);
    }

    public function test_regular_member_cannot_delete_requirement(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->create();
        $project->members()->attach($owner->id, ['role' => 'project_admin']);
        $project->members()->attach($member->id, ['role' => 'tester']);
        $req = Requirement::factory()->create(['project_id' => $project->id]);

        $this->actingAs($member)
            ->delete("/requirements/{$req->id}")
            ->assertForbidden();
    }
}
