<?php

namespace Database\Factories;

use App\Models\Suite;
use App\Models\TestCase;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestCase>
 */
class TestCaseFactory extends Factory
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
            'section_id' => null,
            'title' => fake()->sentence(4),
            'template' => fake()->randomElement(TestCase::TEMPLATES),
            'case_type' => fake()->word(),
            'priority' => fake()->randomElement(TestCase::PRIORITIES),
            'estimate' => fake()->optional()->numberBetween(60, 3600),
            'estimate_forecast' => fake()->optional()->numberBetween(60, 3600),
            'preconditions' => fake()->optional()->sentence(),
            'expected_result' => fake()->optional()->sentence(),
            'refs' => fake()->optional()->bothify('REF-###'),
            'automation_type' => fake()->numberBetween(0, 3),
            'automation_id' => fake()->optional()->uuid(),
            'status' => fake()->randomElement(TestCase::STATUSES),
            'checklist_items' => [],
            'bdd_scenario' => fake()->optional()->paragraph(),
            'created_by' => User::factory(),
            'updated_by' => null,
            'display_order' => fake()->numberBetween(0, 100),
        ];
    }
}
