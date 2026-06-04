<?php

namespace Database\Factories;

use App\Models\Comment;
use App\Models\TestCase;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Comment>
 */
class CommentFactory extends Factory
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
            'commentable_type' => TestCase::class,
            'commentable_id' => TestCase::factory(),
            'parent_id' => null,
            'body' => fake()->paragraph(),
        ];
    }
}
