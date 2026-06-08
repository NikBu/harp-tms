<?php

namespace Database\Factories;

use App\Models\InstanceSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InstanceSetting>
 */
class InstanceSettingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'key' => fake()->unique()->slug(2),
            'value' => fake()->word(),
        ];
    }
}
