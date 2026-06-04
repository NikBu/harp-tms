<?php

namespace Database\Factories;

use App\Models\SharedStep;
use App\Models\SharedStepItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SharedStepItem>
 */
class SharedStepItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'shared_step_id' => SharedStep::factory(),
            'step_index' => fake()->numberBetween(0, 10),
            'content' => fake()->sentence(),
            'expected' => fake()->sentence(),
        ];
    }
}
