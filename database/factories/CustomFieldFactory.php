<?php

namespace Database\Factories;

use App\Models\CustomField;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomField>
 */
class CustomFieldFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'system_name' => fake()->unique()->slug(2),
            'label' => fake()->words(2, true),
            'description' => fake()->optional()->sentence(),
            'field_type' => fake()->randomElement(CustomField::FIELD_TYPES),
            'applies_to' => fake()->randomElement(CustomField::APPLIES_TO),
            'is_global' => fake()->boolean(),
            'created_by' => User::factory(),
        ];
    }
}
