<?php

namespace Database\Factories;

use App\Models\Configuration;
use App\Models\ConfigurationGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Configuration>
 */
class ConfigurationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'group_id' => ConfigurationGroup::factory(),
            'name' => fake()->words(2, true),
        ];
    }
}
