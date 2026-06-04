<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['run_id', 'case_id', 'assigned_to', 'status', 'case_snapshot'])]
class Test extends Model
{
    /** @use HasFactory<\Database\Factories\TestFactory> */
    use HasFactory;

    public const STATUSES = ['untested', 'passed', 'failed', 'blocked', 'retest', 'skipped'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'case_snapshot' => 'array',
        ];
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
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * @return HasMany<TestResult, $this>
     */
    public function results(): HasMany
    {
        return $this->hasMany(TestResult::class);
    }

    /**
     * @return HasOne<TestResult, $this>
     */
    public function latestResult(): HasOne
    {
        return $this->hasOne(TestResult::class)->latestOfMany();
    }
}
