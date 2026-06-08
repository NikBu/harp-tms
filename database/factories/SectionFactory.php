<?php

namespace Database\Factories;

use App\Models\Section;
use App\Models\Suite;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Section>
 */
class SectionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'suite_id' => Suite::factory(),
            'parent_id' => null,
            'name' => fake()->words(2, true),
            'description' => fake()->optional()->sentence(),
            'depth' => 0,
            'display_order' => fake()->numberBetween(0, 100),
        ];
    }
}
