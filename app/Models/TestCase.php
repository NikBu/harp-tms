<?php

namespace App\Models;

use App\Models\Pivots\RequirementTestCase;
use Database\Factories\TestCaseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

#[Fillable(['suite_id', 'section_id', 'title', 'template', 'case_type', 'priority', 'estimate', 'estimate_forecast', 'preconditions', 'expected_result', 'refs', 'automation_type', 'automation_id', 'status', 'checklist_items', 'bdd_scenario', 'created_by', 'updated_by', 'assigned_to', 'display_order'])]
class TestCase extends Model
{
    /** @use HasFactory<TestCaseFactory> */
    use HasFactory, LogsActivity, SoftDeletes;

    public const TEMPLATES = ['steps', 'text', 'exploratory', 'bdd', 'checklist'];

    public const STATUSES = ['draft', 'review', 'approved'];

    public const PRIORITIES = ['critical', 'high', 'medium', 'low'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'checklist_items' => 'array',
            'estimate' => 'integer',
            'estimate_forecast' => 'integer',
            'automation_type' => 'integer',
            'display_order' => 'integer',
        ];
    }

    /**
     * Get Activity log options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['title', 'template', 'priority', 'status']);
    }

    /**
     * @return BelongsTo<Suite, $this>
     */
    public function suite(): BelongsTo
    {
        return $this->belongsTo(Suite::class);
    }

    /**
     * @return BelongsTo<Section, $this>
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
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
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * @return HasMany<TestCaseStep, $this>
     */
    public function steps(): HasMany
    {
        return $this->hasMany(TestCaseStep::class)->orderBy('step_index');
    }

    /**
     * @return BelongsToMany<SharedStep, $this>
     */
    public function sharedSteps(): BelongsToMany
    {
        return $this->belongsToMany(SharedStep::class, 'test_case_shared_steps')->withPivot('position');
    }

    /**
     * @return HasMany<TestCaseHistory, $this>
     */
    public function history(): HasMany
    {
        return $this->hasMany(TestCaseHistory::class);
    }

    /**
     * @return HasMany<TestCaseParameter, $this>
     */
    public function parameters(): HasMany
    {
        return $this->hasMany(TestCaseParameter::class);
    }

    /**
     * @return HasMany<TestCaseParameterDataset, $this>
     */
    public function parameterDatasets(): HasMany
    {
        return $this->hasMany(TestCaseParameterDataset::class);
    }

    /**
     * @return HasMany<TestCaseCustomValue, $this>
     */
    public function customValues(): HasMany
    {
        return $this->hasMany(TestCaseCustomValue::class);
    }

    /**
     * @return BelongsToMany<Requirement, $this>
     */
    public function requirements(): BelongsToMany
    {
        return $this->belongsToMany(Requirement::class, 'requirement_test_case')
            ->using(RequirementTestCase::class)
            ->withPivot('created_by', 'created_at');
        // No ->withTimestamps() — the pivot has created_at but no updated_at.
        // withPivot() alone selects exactly those two columns, nothing else.
    }

    /**
     * @return HasMany<Test, $this>
     */
    public function tests(): HasMany
    {
        return $this->hasMany(Test::class, 'case_id');
    }

    /**
     * @return BelongsToMany<TestRun, $this>
     */
    public function runs(): BelongsToMany
    {
        return $this->belongsToMany(TestRun::class, 'test_run_cases');
    }

    /**
     * @return HasMany<TestResult, $this>
     */
    public function results(): HasMany
    {
        return $this->hasMany(TestResult::class, 'case_id');
    }

    /**
     * @return MorphMany<Watcher, $this>
     */
    public function watchers(): MorphMany
    {
        return $this->morphMany(Watcher::class, 'watchable');
    }

    /**
     * @return MorphMany<Comment, $this>
     */
    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }
}
