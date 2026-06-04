<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Suite;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Suite>
 */
class SuiteFactory extends Factory
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
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'created_by' => User::factory(),
        ];
    }
}
