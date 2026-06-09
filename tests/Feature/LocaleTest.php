<?php

use App\Models\User;

use function Pest\Laravel\actingAs;

test('a guest can switch the locale and it is stored in the session', function (): void {
    $this->post(route('locale.update'), ['locale' => 'ru'])
        ->assertRedirect();

    expect(session('locale'))->toBe('ru');
});

test('an authenticated user persists their chosen locale', function (): void {
    $user = User::factory()->create(['locale' => 'en']);

    actingAs($user)
        ->post(route('locale.update'), ['locale' => 'ru'])
        ->assertRedirect();

    expect($user->fresh()->locale)->toBe('ru');
    expect(session('locale'))->toBe('ru');
});

test('the locale must be a supported value', function (): void {
    $this->post(route('locale.update'), ['locale' => 'de'])
        ->assertSessionHasErrors('locale');
});
