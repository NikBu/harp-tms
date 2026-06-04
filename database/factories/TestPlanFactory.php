<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\TestPlan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestPlan>
 */
class TestPlanFactory extends Factory
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
            'milestone_id' => null,
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'refs' => fake()->optional()->bothify('REF-###'),
            'is_completed' => false,
            'completed_at' => null,
            'created_by' => User::factory(),
            'start_on' => fake()->optional()->date(),
            'end_on' => fake()->optional()->date(),
        ];
    }
}
