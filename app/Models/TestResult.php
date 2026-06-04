<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['test_id', 'run_id', 'case_id', 'status', 'comment', 'elapsed', 'version', 'created_by', 'assigned_to'])]
class TestResult extends Model
{
    /** @use HasFactory<\Database\Factories\TestResultFactory> */
    use HasFactory;

    public $timestamps = false;

    public const CREATED_AT = 'created_at';

    public const UPDATED_AT = null;

    public const STATUSES = ['untested', 'passed', 'failed', 'blocked', 'retest', 'skipped'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'elapsed' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Test, $this>
     */
    public function test(): BelongsTo
    {
        return $this->belongsTo(Test::class);
    }

    /**
     * @return BelongsTo<TestRun, $this>
     */
    public function run(): BelongsTo
    {
        return $this->belongsTo(TestRun::class, 'run_id');
    }

    /**
     * @return BelongsTo<TestCase, $this>
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(TestCase::class, 'case_id');
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
     * @return HasMany<TestResultChecklistItem, $this>
     */
    public function checklistItems(): HasMany
    {
        return $this->hasMany(TestResultChecklistItem::class);
    }

    /**
     * @return HasMany<TestResultCustomValue, $this>
     */
    public function customValues(): HasMany
    {
        return $this->hasMany(TestResultCustomValue::class);
    }

    /**
     * @return HasMany<DefectLink, $this>
     */
    public function defectLinks(): HasMany
    {
        return $this->hasMany(DefectLink::class);
    }
}
