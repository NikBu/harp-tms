<?php

namespace Database\Factories;

use App\Models\Webhook;
use App\Models\WebhookDelivery;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WebhookDelivery>
 */
class WebhookDeliveryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'webhook_id' => Webhook::factory(),
            'event' => fake()->randomElement(['test_run.created', 'test_run.completed', 'test_case.updated']),
            'payload' => ['id' => fake()->numberBetween(1, 1000)],
            'response_status' => fake()->randomElement([200, 201, 400, 500]),
            'response_body' => fake()->optional()->sentence(),
            'delivered_at' => now(),
            'created_at' => now(),
        ];
    }
}
