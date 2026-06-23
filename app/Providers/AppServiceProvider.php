<?php

namespace App\Providers;

use App\Models\Project;
use App\Models\Requirement;
use App\Models\User;
use App\Observers\RequirementObserver;
use App\Policies\ProjectPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->registerObservers();
        $this->registerPolicies();
    }

    protected function registerObservers(): void
    {
        Requirement::observe(RequirementObserver::class);
    }

    protected function registerPolicies(): void
    {
        // Global admin bypasses every Gate check.
        Gate::before(function (User $user, string $ability): ?bool {
            if ($user->hasRole('admin')) {
                return true;
            }

            return null; // fall through to policy
        });

        Gate::policy(Project::class, ProjectPolicy::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
