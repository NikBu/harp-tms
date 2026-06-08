<?php

namespace App\Models;

use Database\Factories\SharedStepFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'title', 'created_by'])]
class SharedStep extends Model
{
    /** @use HasFactory<SharedStepFactory> */
    use HasFactory;

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
     * @return HasMany<SharedStepItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(SharedStepItem::class)->orderBy('step_index');
    }

    /**
     * @return BelongsToMany<TestCase, $this>
     */
    public function testCases(): BelongsToMany
    {
        return $this->belongsToMany(TestCase::class, 'test_case_shared_steps')->withPivot('position');
    }

    /**
     * Get the number of test cases referencing this shared step.
     */
    public function getReferenceCountAttribute(): int
    {
        return $this->testCases()->count();
    }
}
