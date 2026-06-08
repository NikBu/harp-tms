<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Requirement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Requirement>
 */
class RequirementFactory extends Factory
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
            'folder_id' => null,
            'display_id' => fake()->unique()->numerify('REQ-####'),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'type' => fake()->randomElement(Requirement::TYPES),
            'priority' => fake()->randomElement(Requirement::PRIORITIES),
            'status' => fake()->randomElement(Requirement::STATUSES),
            'source' => fake()->randomElement(Requirement::SOURCES),
            'external_ref' => fake()->optional()->bothify('EXT-###'),
            'assigned_to' => null,
            'tags' => fake()->words(3),
            'created_by' => User::factory(),
            'updated_by' => null,
        ];
    }
}
