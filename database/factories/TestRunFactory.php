<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Suite;
use App\Models\TestRun;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestRun>
 */
class TestRunFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'suite_id' => Suite::factory(),
            'plan_id' => null,
            'milestone_id' => null,
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'refs' => fake()->optional()->bothify('REF-###'),
            'include_all' => fake()->boolean(),
            'is_completed' => false,
            'completed_at' => null,
            'created_by' => User::factory(),
            'assigned_to' => null,
            'url' => fake()->optional()->url(),
            'passed_count' => 0,
            'failed_count' => 0,
            'blocked_count' => 0,
            'untested_count' => 0,
            'retest_count' => 0,
            'skipped_count' => 0,
        ];
    }
}
