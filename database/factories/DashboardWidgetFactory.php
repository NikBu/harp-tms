<?php

namespace Database\Factories;

use App\Models\Dashboard;
use App\Models\DashboardWidget;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DashboardWidget>
 */
class DashboardWidgetFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'dashboard_id' => Dashboard::factory(),
            'widget_type' => fake()->randomElement(['chart', 'counter', 'list', 'activity']),
            'title' => fake()->words(2, true),
            'config' => [],
            'position_x' => fake()->numberBetween(0, 11),
            'position_y' => fake()->numberBetween(0, 11),
            'width' => fake()->numberBetween(1, 12),
            'height' => fake()->numberBetween(1, 12),
        ];
    }
}
