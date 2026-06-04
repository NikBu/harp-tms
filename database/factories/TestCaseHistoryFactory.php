<?php

namespace Database\Factories;

use App\Models\TestCase;
use App\Models\TestCaseHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestCaseHistory>
 */
class TestCaseHistoryFactory extends Factory
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
            'snapshot' => ['title' => fake()->sentence(4)],
            'changed_by' => User::factory(),
            'changed_fields' => ['title'],
            'change_note' => fake()->optional()->sentence(),
            'created_at' => now(),
        ];
    }
}
