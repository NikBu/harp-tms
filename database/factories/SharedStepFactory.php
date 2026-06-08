<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\SharedStep;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SharedStep>
 */
class SharedStepFactory extends Factory
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
            'title' => fake()->sentence(3),
            'created_by' => User::factory(),
        ];
    }
}
