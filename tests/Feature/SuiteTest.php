<?php

use App\Models\Project;
use App\Models\Section;
use App\Models\Suite;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('an admin can list suites for any project', function (): void {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    Suite::factory()->count(3)->create(['project_id' => $project->id]);

    actingAs($admin)
        ->get(route('projects.suites.index', $project))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('suites/index')
            ->has('suites.data', 3)
        );
});

test('a non-member cannot access suites', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);

    actingAs($user)
        ->get(route('projects.suites.index', $project))
        ->assertForbidden();
});

test('a member can view suites for their project', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'member']);

    Suite::factory()->count(2)->create(['project_id' => $project->id]);

    actingAs($user)
        ->get(route('projects.suites.index', $project))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('suites/index')
            ->has('suites.data', 2)
        );
});

test('an admin can create a suite', function (): void {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);

    actingAs($admin)
        ->post(route('projects.suites.store', $project), [
            'name' => 'Regression',
            'description' => 'Regression suite',
        ])
        ->assertRedirect();

    $suite = Suite::firstWhere('name', 'Regression');

    expect($suite)->not->toBeNull();
    expect($suite->project_id)->toBe($project->id);
});

test('a member can create a suite in their project', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'member']);

    actingAs($user)
        ->post(route('projects.suites.store', $project), [
            'name' => 'Smoke',
        ])
        ->assertRedirect();

    expect(Suite::firstWhere('name', 'Smoke'))->not->toBeNull();
});

test('a non-project-admin cannot delete a suite', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'member']);

    $suite = Suite::factory()->create(['project_id' => $project->id]);

    actingAs($user)
        ->delete(route('suites.destroy', $suite))
        ->assertForbidden();

    expect(Suite::find($suite->id))->not->toBeNull();
});

test('a project admin member can delete a suite', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'project_admin']);

    $suite = Suite::factory()->create(['project_id' => $project->id]);

    actingAs($user)
        ->delete(route('suites.destroy', $suite))
        ->assertRedirect(route('projects.suites.index', $project));

    expect(Suite::find($suite->id))->toBeNull();
});

test('a member can create a section within a suite', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'member']);

    $suite = Suite::factory()->create(['project_id' => $project->id]);

    actingAs($user)
        ->post(route('projects.suites.sections.store', [$suite->project, $suite]), [
            'name' => 'Authentication',
        ])
        ->assertRedirect();

    $section = Section::firstWhere('name', 'Authentication');

    expect($section)->not->toBeNull();
    expect($section->suite_id)->toBe($suite->id);
    expect($section->display_order)->toBe(1);
});

test('the reorder endpoint accepts a valid items payload', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'member']);

    $suite = Suite::factory()->create(['project_id' => $project->id]);
    $first = Section::factory()->create(['suite_id' => $suite->id, 'display_order' => 1]);
    $second = Section::factory()->create(['suite_id' => $suite->id, 'display_order' => 2]);

    actingAs($user)
        ->post(route('sections.reorder', [$project, $suite]), [
            'items' => [
                ['id' => $first->id, 'position' => 2],
                ['id' => $second->id, 'position' => 1],
            ],
        ])
        ->assertNoContent();

    expect($first->fresh()->display_order)->toBe(2);
    expect($second->fresh()->display_order)->toBe(1);
});
