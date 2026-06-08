<?php

namespace App\Models;

use Database\Factories\RequirementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

#[Fillable(['project_id', 'folder_id', 'display_id', 'title', 'description', 'type', 'priority', 'status', 'source', 'external_ref', 'assigned_to', 'tags', 'created_by', 'updated_by'])]
class Requirement extends Model
{
    /** @use HasFactory<RequirementFactory> */
    use HasFactory, LogsActivity;

    public const TYPES = ['functional', 'non_functional', 'business', 'constraint', 'user_story'];

    public const PRIORITIES = ['critical', 'high', 'medium', 'low'];

    public const STATUSES = ['draft', 'under_review', 'approved', 'obsolete'];

    public const SOURCES = ['manual', 'jira', 'azure_devops', 'imported'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tags' => 'array',
        ];
    }

    /**
     * Get Activity log options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly([
            'project_id', 'folder_id', 'display_id', 'title', 'description', 'type',
            'priority', 'status', 'source', 'external_ref', 'assigned_to', 'tags',
            'created_by', 'updated_by',
        ]);
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<RequirementFolder, $this>
     */
    public function folder(): BelongsTo
    {
        return $this->belongsTo(RequirementFolder::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
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
     * @return HasMany<RequirementComment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(RequirementComment::class);
    }

    /**
     * @return HasMany<RequirementHistory, $this>
     */
    public function history(): HasMany
    {
        return $this->hasMany(RequirementHistory::class);
    }

    /**
     * @return BelongsToMany<TestCase, $this>
     */
    public function testCases(): BelongsToMany
    {
        return $this->belongsToMany(TestCase::class, 'requirement_test_case')
            ->withPivot('created_by')   // ← only non-timestamp extra columns here
            ->withTimestamps(false);    // ← pivot has created_at but NOT updated_at
    }
}