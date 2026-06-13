<?php

use App\Models\Project;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('guests are redirected from the project reports page', function (): void {
    $project = Project::factory()->create();

    $this->get(route('projects.reports.index', $project))
        ->assertRedirect(route('login'));
});

test('a member can view the project reports page', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $project->members()->attach($user, ['role' => 'member']);

    actingAs($user)
        ->get(route('projects.reports.index', $project))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/index')
            ->where('project.id', $project->id)
        );
});

test('a non-member is forbidden from viewing the project reports page', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create();

    actingAs($user)
        ->get(route('projects.reports.index', $project))
        ->assertForbidden();
});
