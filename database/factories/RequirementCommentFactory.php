<?php

namespace Database\Factories;

use App\Models\Requirement;
use App\Models\RequirementComment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RequirementComment>
 */
class RequirementCommentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'requirement_id' => Requirement::factory(),
            'parent_id' => null,
            'user_id' => User::factory(),
            'body' => fake()->paragraph(),
        ];
    }
}
