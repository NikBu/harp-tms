<?php

use App\Models\Project;
use App\Models\Suite;
use App\Models\TestCase;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

use function Pest\Laravel\actingAs;

beforeEach(function (): void {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('an admin can list test cases for any suite', function (): void {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $suite = Suite::factory()->create(['project_id' => $project->id]);
    TestCase::factory()->count(3)->create(['suite_id' => $suite->id]);

    actingAs($admin)
        ->get(route('suites.cases.index', $suite))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('test-cases/index')
            ->has('cases.data', 3)
        );
});

test('a non-member cannot access test cases', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $suite = Suite::factory()->create(['project_id' => $project->id]);

    actingAs($user)
        ->get(route('suites.cases.index', $suite))
        ->assertForbidden();
});

test('a member can list test cases in their project suite', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'member']);

    $suite = Suite::factory()->create(['project_id' => $project->id]);
    TestCase::factory()->count(2)->create(['suite_id' => $suite->id]);

    actingAs($user)
        ->get(route('suites.cases.index', $suite))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('test-cases/index')
            ->has('cases.data', 2)
        );
});

test('an admin can create a text test case', function (): void {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $suite = Suite::factory()->create(['project_id' => $project->id]);

    actingAs($admin)
        ->post(route('suites.cases.store', $suite), [
            'title' => 'Login works',
            'template' => 1,
            'body' => 'The user can log in successfully.',
        ])
        ->assertRedirect();

    $testCase = TestCase::firstWhere('title', 'Login works');

    expect($testCase)->not->toBeNull();
    expect($testCase->suite_id)->toBe($suite->id);
    expect($testCase->template)->toBe('text');
    expect($testCase->expected_result)->toBe('The user can log in successfully.');
});

test('a member can create a test case with steps', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'member']);

    $suite = Suite::factory()->create(['project_id' => $project->id]);

    actingAs($user)
        ->post(route('suites.cases.store', $suite), [
            'title' => 'Checkout flow',
            'template' => 2,
            'steps' => [
                ['action' => 'Open cart', 'expected' => 'Cart is shown'],
                ['action' => 'Click checkout', 'expected' => 'Payment page'],
            ],
        ])
        ->assertRedirect();

    $testCase = TestCase::firstWhere('title', 'Checkout flow');

    expect($testCase)->not->toBeNull();
    expect($testCase->template)->toBe('steps');
    expect($testCase->steps()->count())->toBe(2);
    expect($testCase->steps()->first()->content)->toBe('Open cart');
});

test('a non-project-admin cannot delete a test case', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'member']);

    $suite = Suite::factory()->create(['project_id' => $project->id]);
    $testCase = TestCase::factory()->create(['suite_id' => $suite->id]);

    actingAs($user)
        ->delete(route('cases.destroy', $testCase))
        ->assertForbidden();

    expect(TestCase::find($testCase->id))->not->toBeNull();
});

test('a project admin can delete a test case', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'project_admin']);

    $suite = Suite::factory()->create(['project_id' => $project->id]);
    $testCase = TestCase::factory()->create(['suite_id' => $suite->id]);

    actingAs($user)
        ->delete(route('cases.destroy', $testCase))
        ->assertRedirect(route('suites.cases.index', $suite));

    expect(TestCase::find($testCase->id))->toBeNull();
});

test('a member can update a test case', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $project->members()->attach($user, ['role' => 'member']);

    $suite = Suite::factory()->create(['project_id' => $project->id]);
    $testCase = TestCase::factory()->create([
        'suite_id' => $suite->id,
        'title' => 'Old title',
        'template' => 'text',
    ]);

    actingAs($user)
        ->patch(route('cases.update', $testCase), [
            'title' => 'New title',
            'template' => 1,
            'body' => 'Updated description.',
        ])
        ->assertRedirect(route('cases.show', $testCase));

    expect($testCase->fresh()->title)->toBe('New title');
    expect($testCase->fresh()->expected_result)->toBe('Updated description.');
});

test('an admin can copy a test case to another suite', function (): void {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $project = Project::factory()->create(['suite_mode' => Project::SUITE_MULTI]);
    $source = Suite::factory()->create(['project_id' => $project->id]);
    $target = Suite::factory()->create(['project_id' => $project->id]);

    $testCase = TestCase::factory()->create([
        'suite_id' => $source->id,
        'title' => 'Reusable case',
        'template' => 'steps',
    ]);
    $testCase->steps()->create(['step_index' => 1, 'content' => 'Step one', 'expected' => 'Result one']);

    actingAs($admin)
        ->post(route('cases.copy', $testCase), [
            'suite_id' => $target->id,
        ])
        ->assertRedirect();

    $copy = TestCase::where('suite_id', $target->id)->firstWhere('title', 'Reusable case');

    expect($copy)->not->toBeNull();
    expect($copy->id)->not->toBe($testCase->id);
    expect($copy->steps()->count())->toBe(1);
    expect($copy->steps()->first()->content)->toBe('Step one');
});
