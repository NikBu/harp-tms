<?php

namespace Database\Factories;

use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestRun;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Test>
 */
class TestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'run_id' => TestRun::factory(),
            'case_id' => TestCase::factory(),
            'assigned_to' => null,
            'status' => fake()->randomElement(Test::STATUSES),
            'case_snapshot' => ['title' => fake()->sentence(4)],
        ];
    }
}
