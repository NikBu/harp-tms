<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company(),
            'description' => fake()->sentence(),
            'announcement' => fake()->optional()->paragraph(),
            'show_announcement' => fake()->boolean(),
            'suite_mode' => fake()->randomElement([Project::SUITE_SINGLE, Project::SUITE_SINGLE_BASELINE, Project::SUITE_MULTI]),
            'is_completed' => false,
            'completed_at' => null,
            'created_by' => User::factory(),
        ];
    }
}
