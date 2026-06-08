<?php

namespace Database\Factories;

use App\Models\CustomField;
use App\Models\CustomFieldOption;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomFieldOption>
 */
class CustomFieldOptionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'custom_field_id' => CustomField::factory(),
            'option_key' => fake()->unique()->numberBetween(1, 1000),
            'option_label' => fake()->words(2, true),
            'display_order' => fake()->numberBetween(0, 100),
        ];
    }
}
