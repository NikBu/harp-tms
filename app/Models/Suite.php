<?php

namespace App\Models;

use Database\Factories\SuiteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

#[Fillable(['project_id', 'name', 'description', 'created_by'])]
class Suite extends Model
{
    /** @use HasFactory<SuiteFactory> */
    use HasFactory, LogsActivity;

    /**
     * Get Activity log options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['name', 'description']);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Section, $this>
     */
    public function sections(): HasMany
    {
        return $this->hasMany(Section::class);
    }

    /**
     * @return HasMany<Section, $this>
     */
    public function rootSections(): HasMany
    {
        return $this->hasMany(Section::class)->whereNull('parent_id');
    }

    /**
     * @return HasMany<TestCase, $this>
     */
    public function testCases(): HasMany
    {
        return $this->hasMany(TestCase::class);
    }

    /**
     * @return HasMany<TestRun, $this>
     */
    public function testRuns(): HasMany
    {
        return $this->hasMany(TestRun::class);
    }
}
