<?php

namespace Database\Factories;

use App\Models\TestCase;
use App\Models\TestCaseParameterDataset;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestCaseParameterDataset>
 */
class TestCaseParameterDatasetFactory extends Factory
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
            'dataset_name' => fake()->words(2, true),
            'values' => ['param' => fake()->word()],
            'display_order' => fake()->numberBetween(0, 100),
        ];
    }
}
