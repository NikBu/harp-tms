<?php

namespace Database\Factories;

use App\Models\Integration;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Integration>
 */
class IntegrationFactory extends Factory
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
            'integration_type' => fake()->randomElement(['jira', 'github', 'gitlab', 'slack', 'azure_devops']),
            'name' => fake()->words(2, true),
            'config' => [],
            'credentials' => fake()->sha256(),
            'is_active' => true,
            'created_by' => User::factory(),
        ];
    }
}
