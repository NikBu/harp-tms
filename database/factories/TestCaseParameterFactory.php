<?php

namespace Database\Factories;

use App\Models\TestCase;
use App\Models\TestCaseParameter;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestCaseParameter>
 */
class TestCaseParameterFactory extends Factory
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
            'name' => fake()->word(),
        ];
    }
}
