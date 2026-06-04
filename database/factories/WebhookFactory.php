<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use App\Models\Webhook;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Webhook>
 */
class WebhookFactory extends Factory
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
            'name' => fake()->words(2, true),
            'url' => fake()->url(),
            'events' => fake()->randomElements(['test_run.created', 'test_run.completed', 'test_case.updated'], 2),
            'secret' => Str::random(40),
            'is_active' => true,
            'created_by' => User::factory(),
        ];
    }
}
