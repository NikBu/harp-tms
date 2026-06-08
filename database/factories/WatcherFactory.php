<?php

namespace Database\Factories;

use App\Models\TestCase;
use App\Models\User;
use App\Models\Watcher;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Watcher>
 */
class WatcherFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'watchable_type' => TestCase::class,
            'watchable_id' => TestCase::factory(),
        ];
    }
}
