<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Suite;
use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestResult;
use App\Models\TestRun;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase as BaseTestCase;

class TestRunTest extends BaseTestCase
{
    use RefreshDatabase;

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private function makeProject(User $owner): Project
    {
        $project = Project::factory()->create();
        $project->members()->attach($owner->id, ['role' => 'project_admin']);

        return $project;
    }

    private function makeSuiteWithCases(Project $project, int $caseCount = 3): Suite
    {
        $suite = Suite::factory()->create(['project_id' => $project->id]);
        TestCase::factory($caseCount)->create(['suite_id' => $suite->id]);

        return $suite;
    }

    // ─────────────────────────────────────────────────────────────
    // Index
    // ─────────────────────────────────────────────────────────────

    public function test_member_can_list_runs(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        TestRun::factory(2)->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->get("/projects/{$project->id}/runs")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('runs/index')
                ->has('runs.data', 2)
            );
    }

    public function test_non_member_cannot_list_runs(): void
    {
        $project = Project::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($other)
            ->get("/projects/{$project->id}/runs")
            ->assertForbidden();
    }

    // ─────────────────────────────────────────────────────────────
    // Create / Store
    // ─────────────────────────────────────────────────────────────

    public function test_member_can_see_create_form(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->get("/projects/{$project->id}/runs/create")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('runs/create'));
    }

    public function test_store_creates_run_with_all_cases(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $suite = $this->makeSuiteWithCases($project, 3);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/runs", [
                'name' => 'My Run',
                'suite_id' => $suite->id,
                'include_all' => true,
            ])
            ->assertRedirect();

        $run = TestRun::where('name', 'My Run')->firstOrFail();
        $this->assertSame($project->id, $run->project_id);
        $this->assertSame($suite->id, $run->suite_id);
        $this->assertTrue($run->include_all);
        $this->assertSame(3, $run->tests()->count());
        $this->assertSame(3, $run->untested_count);
        $this->assertSame(0, $run->passed_count);
    }

    public function test_store_creates_run_with_selected_cases(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $suite = Suite::factory()->create(['project_id' => $project->id]);
        $cases = TestCase::factory(4)->create(['suite_id' => $suite->id]);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/runs", [
                'name' => 'Selective Run',
                'suite_id' => $suite->id,
                'include_all' => false,
                'case_ids' => $cases->take(2)->pluck('id')->toArray(),
            ])
            ->assertRedirect();

        $run = TestRun::where('name', 'Selective Run')->firstOrFail();
        $this->assertSame(2, $run->tests()->count());
        $this->assertSame(2, $run->untested_count);
    }

    public function test_store_requires_name(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/runs", ['name' => ''])
            ->assertSessionHasErrors('name');
    }

    public function test_store_sets_created_by(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/runs", ['name' => 'Run X', 'include_all' => false]);

        $run = TestRun::where('name', 'Run X')->firstOrFail();
        $this->assertSame($user->id, $run->created_by);
    }

    // ─────────────────────────────────────────────────────────────
    // Show
    // ─────────────────────────────────────────────────────────────

    public function test_member_can_view_run(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $run = TestRun::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->get("/runs/{$run->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('runs/show')
                ->where('run.id', $run->id)
            );
    }

    // ─────────────────────────────────────────────────────────────
    // Add Result
    // ─────────────────────────────────────────────────────────────

    public function test_member_can_submit_result(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $suite = $this->makeSuiteWithCases($project, 1);
        $run = TestRun::factory()->create(['project_id' => $project->id, 'untested_count' => 1]);
        $case = TestCase::where('suite_id', $suite->id)->first();
        $test = Test::factory()->create(['run_id' => $run->id, 'case_id' => $case->id, 'status' => 'untested']);

        $this->actingAs($user)
            ->post("/runs/{$run->id}/tests/{$test->id}/results", [
                'status' => 'passed',
                'comment' => 'Looks good',
                'elapsed' => '2m',
                'version' => '1.0.0',
            ])
            ->assertRedirect();

        // A TestResult row was appended
        $this->assertDatabaseHas('test_results', [
            'test_id' => $test->id,
            'run_id' => $run->id,
            'status' => 'passed',
            'comment' => 'Looks good',
            'elapsed' => 120,
            'version' => '1.0.0',
            'created_by' => $user->id,
        ]);

        // Test row status was updated
        $this->assertSame('passed', $test->fresh()->status);

        // Run counters were recalculated
        $run->refresh();
        $this->assertSame(1, $run->passed_count);
        $this->assertSame(0, $run->untested_count);
    }

    public function test_result_cannot_be_submitted_to_closed_run(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $run = TestRun::factory()->create([
            'project_id' => $project->id,
            'is_completed' => true,
        ]);
        $case = TestCase::factory()->create(['suite_id' => Suite::factory()->create(['project_id' => $project->id])->id]);
        $test = Test::factory()->create(['run_id' => $run->id, 'case_id' => $case->id]);

        $this->actingAs($user)
            ->post("/runs/{$run->id}/tests/{$test->id}/results", ['status' => 'passed'])
            ->assertStatus(422);
    }

    public function test_result_test_must_belong_to_run(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $run = TestRun::factory()->create(['project_id' => $project->id]);
        $otherRun = TestRun::factory()->create(['project_id' => $project->id]);
        $case = TestCase::factory()->create(['suite_id' => Suite::factory()->create(['project_id' => $project->id])->id]);
        $test = Test::factory()->create(['run_id' => $otherRun->id, 'case_id' => $case->id]);

        $this->actingAs($user)
            ->post("/runs/{$run->id}/tests/{$test->id}/results", ['status' => 'passed'])
            ->assertNotFound();
    }

    public function test_elapsed_parsed_from_human_string(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $suite = $this->makeSuiteWithCases($project, 1);
        $run = TestRun::factory()->create(['project_id' => $project->id]);
        $case = TestCase::where('suite_id', $suite->id)->first();
        $test = Test::factory()->create(['run_id' => $run->id, 'case_id' => $case->id]);

        $this->actingAs($user)
            ->post("/runs/{$run->id}/tests/{$test->id}/results", [
                'status' => 'failed',
                'elapsed' => '1h 30m',
            ]);

        $this->assertDatabaseHas('test_results', [
            'test_id' => $test->id,
            'elapsed' => 5400, // 1*3600 + 30*60
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Close / Reopen
    // ─────────────────────────────────────────────────────────────

    public function test_member_can_close_run(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $run = TestRun::factory()->create(['project_id' => $project->id, 'is_completed' => false]);

        $this->actingAs($user)
            ->patch("/runs/{$run->id}/close")
            ->assertRedirect();

        $run->refresh();
        $this->assertTrue($run->is_completed);
        $this->assertNotNull($run->completed_at);
    }

    public function test_closing_already_closed_run_returns_422(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $run = TestRun::factory()->create(['project_id' => $project->id, 'is_completed' => true]);

        $this->actingAs($user)
            ->patch("/runs/{$run->id}/close")
            ->assertStatus(422);
    }

    public function test_member_can_reopen_run(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $run = TestRun::factory()->create([
            'project_id' => $project->id,
            'is_completed' => true,
            'completed_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch("/runs/{$run->id}/reopen")
            ->assertRedirect();

        $run->refresh();
        $this->assertFalse($run->is_completed);
        $this->assertNull($run->completed_at);
    }

    // ─────────────────────────────────────────────────────────────
    // Delete
    // ─────────────────────────────────────────────────────────────

    public function test_project_admin_can_delete_run(): void
    {
        $user = User::factory()->create();
        $project = $this->makeProject($user);
        $run = TestRun::factory()->create(['project_id' => $project->id]);

        $this->actingAs($user)
            ->delete("/runs/{$run->id}")
            ->assertRedirect();

        $this->assertModelMissing($run);
    }

    public function test_regular_member_cannot_delete_run(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->create();
        $project->members()->attach($owner->id, ['role' => 'project_admin']);
        $project->members()->attach($member->id, ['role' => 'tester']);
        $run = TestRun::factory()->create(['project_id' => $project->id]);

        $this->actingAs($member)
            ->delete("/runs/{$run->id}")
            ->assertForbidden();
    }

    public function test_unauthenticated_user_is_redirected(): void
    {
        $run = TestRun::factory()->create();

        $this->get("/runs/{$run->id}")->assertRedirect('/login');
    }
}
