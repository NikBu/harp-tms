<?php

namespace App\Models;

use Database\Factories\TestPlanFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

#[Fillable(['project_id', 'milestone_id', 'name', 'description', 'refs', 'is_completed', 'completed_at', 'created_by', 'start_on', 'end_on'])]
class TestPlan extends Model
{
    /** @use HasFactory<TestPlanFactory> */
    use HasFactory, LogsActivity;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_completed' => 'boolean',
            'completed_at' => 'datetime',
            'start_on' => 'date',
            'end_on' => 'date',
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
     * @return HasMany<TestPlanEntry, $this>
     */
    public function entries(): HasMany
    {
        return $this->hasMany(TestPlanEntry::class, 'plan_id'); // ← explicit FK
    }

    /**
     * @return HasManyThrough<TestRun, TestPlanEntry, $this>
     */
    public function runs(): HasManyThrough
    {
        return $this->hasManyThrough(TestRun::class, TestPlanEntry::class, 'plan_id', 'id', 'id', 'run_id');
    }
}
