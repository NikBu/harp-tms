<?php

namespace Database\Factories;

use App\Models\CustomField;
use App\Models\TestCase;
use App\Models\TestCaseCustomValue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestCaseCustomValue>
 */
class TestCaseCustomValueFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'test_case_id' => TestCase::factory(),
            'custom_field_id' => CustomField::factory(),
            'value_string' => fake()->optional()->word(),
            'value_integer' => fake()->optional()->numberBetween(0, 1000),
            'value_text' => fake()->optional()->sentence(),
            'value_boolean' => fake()->boolean(),
            'value_json' => null,
        ];
    }
}
