<?php

namespace Database\Factories;

use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestResult;
use App\Models\TestRun;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestResult>
 */
class TestResultFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'test_id' => Test::factory(),
            'run_id' => TestRun::factory(),
            'case_id' => TestCase::factory(),
            'status' => fake()->randomElement(TestResult::STATUSES),
            'comment' => fake()->optional()->sentence(),
            'elapsed' => fake()->optional()->numberBetween(1, 3600),
            'version' => fake()->optional()->numerify('#.#.#'),
            'created_by' => User::factory(),
            'assigned_to' => null,
            'created_at' => now(),
        ];
    }
}
