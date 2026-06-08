<?php

namespace Database\Factories;

use App\Models\TestResult;
use App\Models\TestResultChecklistItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestResultChecklistItem>
 */
class TestResultChecklistItemFactory extends Factory
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
            'item_index' => fake()->numberBetween(0, 10),
            'status' => fake()->randomElement(TestResultChecklistItem::STATUSES),
            'comment' => fake()->optional()->sentence(),
        ];
    }
}
