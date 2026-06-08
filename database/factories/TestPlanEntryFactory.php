<?php

namespace Database\Factories;

use App\Models\TestPlan;
use App\Models\TestPlanEntry;
use App\Models\TestRun;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TestPlanEntry>
 */
class TestPlanEntryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'plan_id' => TestPlan::factory(),
            'run_id' => TestRun::factory(),
            'assigned_to' => null,
        ];
    }
}
