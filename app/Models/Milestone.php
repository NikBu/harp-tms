<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

#[Fillable(['project_id', 'parent_id', 'name', 'description', 'refs', 'status', 'start_on', 'due_on', 'completed_at', 'is_completed', 'created_by'])]
class Milestone extends Model
{
    /** @use HasFactory<\Database\Factories\MilestoneFactory> */
    use HasFactory, LogsActivity;

    public const STATUSES = ['upcoming', 'active', 'completed'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_on' => 'date',
            'due_on' => 'date',
            'completed_at' => 'datetime',
            'is_completed' => 'boolean',
        ];
    }

    /**
     * Get Activity log options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['name', 'status', 'is_completed']);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<Milestone, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Milestone::class, 'parent_id');
    }

    /**
     * @return HasMany<Milestone, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(Milestone::class, 'parent_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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
}
