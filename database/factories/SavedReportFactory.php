<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\SavedReport;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavedReport>
 */
class SavedReportFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'name' => fake()->words(3, true),
            'report_type' => fake()->randomElement(['summary', 'comparison', 'activity', 'coverage']),
            'filters' => [],
            'is_scheduled' => false,
            'schedule_cron' => null,
            'schedule_recipients' => [],
            'access_level' => fake()->randomElement(['private', 'project', 'public']),
            'public_token' => null,
        ];
    }
}
