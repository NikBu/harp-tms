<?php

namespace Database\Factories;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Milestone>
 */
class MilestoneFactory extends Factory
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
            'parent_id' => null,
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'refs' => fake()->optional()->bothify('REF-###'),
            'status' => fake()->randomElement(Milestone::STATUSES),
            'start_on' => fake()->optional()->date(),
            'due_on' => fake()->optional()->date(),
            'completed_at' => null,
            'is_completed' => false,
            'created_by' => User::factory(),
        ];
    }
}
