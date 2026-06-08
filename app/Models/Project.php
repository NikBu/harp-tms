<?php

namespace App\Models;

use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

#[Fillable(['name', 'description', 'announcement', 'show_announcement', 'suite_mode', 'is_completed', 'completed_at', 'created_by'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory, LogsActivity;

    public const SUITE_SINGLE = 1;

    public const SUITE_SINGLE_BASELINE = 2;

    public const SUITE_MULTI = 3;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'show_announcement' => 'boolean',
            'is_completed' => 'boolean',
            'completed_at' => 'datetime',
            'suite_mode' => 'integer',
        ];
    }

    /**
     * Get Activity log options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['name', 'suite_mode', 'is_completed']);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('role')->withTimestamps();
    }

    /**
     * @return HasMany<Suite, $this>
     */
    public function suites(): HasMany
    {
        return $this->hasMany(Suite::class);
    }

    /**
     * @return HasMany<Milestone, $this>
     */
    public function milestones(): HasMany
    {
        return $this->hasMany(Milestone::class);
    }

    /**
     * @return HasManyThrough<TestCase, Suite, $this>
     */
    public function testCases(): HasManyThrough
    {
        return $this->hasManyThrough(TestCase::class, Suite::class);
    }

    /**
     * @return HasMany<TestPlan, $this>
     */
    public function testPlans(): HasMany
    {
        return $this->hasMany(TestPlan::class);
    }

    /**
     * @return HasMany<TestRun, $this>
     */
    public function testRuns(): HasMany
    {
        return $this->hasMany(TestRun::class);
    }

    /**
     * @return HasMany<Requirement, $this>
     */
    public function requirements(): HasMany
    {
        return $this->hasMany(Requirement::class);
    }

    /**
     * @return HasMany<RequirementFolder, $this>
     */
    public function requirementFolders(): HasMany
    {
        return $this->hasMany(RequirementFolder::class);
    }

    /**
     * @return HasMany<ConfigurationGroup, $this>
     */
    public function configurationGroups(): HasMany
    {
        return $this->hasMany(ConfigurationGroup::class);
    }

    /**
     * @return BelongsToMany<CustomField, $this>
     */
    public function customFields(): BelongsToMany
    {
        return $this->belongsToMany(CustomField::class, 'custom_field_project')
            ->withPivot('is_required', 'display_order', 'default_value');
    }

    /**
     * @return HasMany<SharedStep, $this>
     */
    public function sharedSteps(): HasMany
    {
        return $this->hasMany(SharedStep::class);
    }

    /**
     * @return HasMany<Webhook, $this>
     */
    public function webhooks(): HasMany
    {
        return $this->hasMany(Webhook::class);
    }

    /**
     * @return HasMany<Integration, $this>
     */
    public function integrations(): HasMany
    {
        return $this->hasMany(Integration::class);
    }

    /**
     * @return HasMany<SavedReport, $this>
     */
    public function savedReports(): HasMany
    {
        return $this->hasMany(SavedReport::class);
    }
}
