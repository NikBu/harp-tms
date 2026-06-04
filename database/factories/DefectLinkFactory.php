<?php

namespace Database\Factories;

use App\Models\DefectLink;
use App\Models\TestResult;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DefectLink>
 */
class DefectLinkFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'test_result_id' => TestResult::factory(),
            'tracker_type' => fake()->randomElement(['jira', 'github', 'gitlab', 'azure_devops']),
            'external_id' => fake()->bothify('BUG-###'),
            'external_url' => fake()->url(),
            'title' => fake()->sentence(),
            'status' => fake()->randomElement(['open', 'in_progress', 'closed']),
            'cached_metadata' => null,
            'cache_refreshed_at' => null,
            'created_by' => User::factory(),
            'created_at' => now(),
        ];
    }
}
