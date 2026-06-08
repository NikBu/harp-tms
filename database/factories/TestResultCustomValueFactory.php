<?php

namespace Database\Factories;

use App\Models\CustomField;
use App\Models\TestResult;
use App\Models\TestResultCustomValue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestResultCustomValue>
 */
class TestResultCustomValueFactory extends Factory
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
            'custom_field_id' => CustomField::factory(),
            'value_string' => fake()->optional()->word(),
            'value_integer' => fake()->optional()->numberBetween(0, 1000),
            'value_text' => fake()->optional()->sentence(),
            'value_boolean' => fake()->boolean(),
            'value_json' => null,
        ];
    }
}
