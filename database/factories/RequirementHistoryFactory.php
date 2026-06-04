<?php

namespace Database\Factories;

use App\Models\Requirement;
use App\Models\RequirementHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RequirementHistory>
 */
class RequirementHistoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'requirement_id' => Requirement::factory(),
            'changed_by' => User::factory(),
            'field_name' => fake()->randomElement(['title', 'status', 'priority', 'description']),
            'old_value' => fake()->word(),
            'new_value' => fake()->word(),
            'created_at' => now(),
        ];
    }
}
