<?php

use App\Models\Project;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('guests are redirected from the projects index', function (): void {
    $this->get(route('projects.index'))->assertRedirect(route('login'));
});

test('an admin sees all projects on the index', function (): void {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    Project::factory()->count(3)->create();

    actingAs($admin)
        ->get(route('projects.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/index')
            ->has('projects.data', 3)
        );
});

test('a non-admin only sees projects they are a member of', function (): void {
    $user = User::factory()->create();

    $member = Project::factory()->create();
    $member->members()->attach($user, ['role' => 'member']);

    Project::factory()->count(2)->create();

    actingAs($user)
        ->get(route('projects.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/index')
            ->has('projects.data', 1)
        );
});

test('a user can create a project and is attached as project admin', function (): void {
    $user = User::factory()->create();

    actingAs($user)
        ->post(route('projects.store'), [
            'name' => 'Apollo',
            'description' => 'A new project',
            'suite_mode' => Project::SUITE_MULTI,
        ])
        ->assertRedirect();

    $project = Project::firstWhere('name', 'Apollo');

    expect($project)->not->toBeNull();
    expect($project->created_by)->toBe($user->id);
    expect($project->members()->where('users.id', $user->id)->first()->pivot->role)
        ->toBe('project_admin');
});

test('creating a project requires a name and a valid suite mode', function (): void {
    $user = User::factory()->create();

    actingAs($user)
        ->post(route('projects.store'), [
            'name' => '',
            'suite_mode' => 99,
        ])
        ->assertSessionHasErrors(['name', 'suite_mode']);
});

test('a member can view a project dashboard', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user, ['role' => 'member']);

    actingAs($user)
        ->get(route('projects.show', $project))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/show')
            ->where('project.id', $project->id)
        );
});

test('a non-member is forbidden from viewing a project', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();

    actingAs($user)
        ->get(route('projects.show', $project))
        ->assertForbidden();
});

test('a project admin can delete a project', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user, ['role' => 'project_admin']);

    actingAs($user)
        ->delete(route('projects.destroy', $project))
        ->assertRedirect(route('projects.index'));

    expect(Project::find($project->id))->toBeNull();
});

test('a plain member cannot delete a project', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user, ['role' => 'member']);

    actingAs($user)
        ->delete(route('projects.destroy', $project))
        ->assertForbidden();

    expect(Project::find($project->id))->not->toBeNull();
});

test('a member can update a project and toggle completion', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['is_completed' => false]);
    $project->members()->attach($user, ['role' => 'member']);

    actingAs($user)
        ->put(route('projects.update', $project), [
            'name' => 'Renamed',
            'is_completed' => true,
        ])
        ->assertRedirect();

    $project->refresh();

    expect($project->name)->toBe('Renamed');
    expect($project->is_completed)->toBeTrue();
    expect($project->completed_at)->not->toBeNull();
});
