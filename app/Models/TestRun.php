<?php

namespace App\Models;

use Database\Factories\TestRunFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

#[Fillable(['project_id', 'suite_id', 'plan_id', 'milestone_id', 'name', 'description', 'refs', 'start_on', 'end_on', 'include_all', 'is_completed', 'completed_at', 'created_by', 'assigned_to', 'url', 'passed_count', 'failed_count', 'blocked_count', 'untested_count', 'retest_count', 'skipped_count'])]
class TestRun extends Model
{
    /** @use HasFactory<TestRunFactory> */
    use HasFactory, LogsActivity;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'include_all' => 'boolean',
            'is_completed' => 'boolean',
            'completed_at' => 'datetime',
            'start_on' => 'date',
            'end_on' => 'date',
            'passed_count' => 'integer',
            'failed_count' => 'integer',
            'blocked_count' => 'integer',
            'untested_count' => 'integer',
            'retest_count' => 'integer',
            'skipped_count' => 'integer',
        ];
    }

    /**
     * Get Activity log options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['name', 'is_completed']);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<Suite, $this>
     */
    public function suite(): BelongsTo
    {
        return $this->belongsTo(Suite::class);
    }

    /**
     * @return BelongsTo<TestPlan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(TestPlan::class, 'plan_id');
    }

    /**
     * @return BelongsTo<Milestone, $this>
     */
    public function milestone(): BelongsTo
    {
        return $this->belongsTo(Milestone::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * @return BelongsToMany<Configuration, $this>
     */
    public function configurations(): BelongsToMany
    {
        return $this->belongsToMany(Configuration::class, 'test_run_configs');
    }

    /**
     * @return BelongsToMany<TestCase, $this>
     */
    public function selectedCases(): BelongsToMany
    {
        return $this->belongsToMany(TestCase::class, 'test_run_cases');
    }

    /**
     * @return HasMany<Test, $this>
     */
    public function tests(): HasMany
    {
        return $this->hasMany(Test::class, 'run_id');
    }

    /**
     * @return HasMany<TestResult, $this>
     */
    public function results(): HasMany
    {
        return $this->hasMany(TestResult::class, 'run_id');
    }

    /**
     * @return HasOne<TestPlanEntry, $this>
     */
    public function planEntry(): HasOne
    {
        return $this->hasOne(TestPlanEntry::class, 'run_id');
    }
}
