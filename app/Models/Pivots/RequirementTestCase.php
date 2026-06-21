<?php

namespace App\Models\Pivots;

use App\Models\Requirement;
use App\Models\TestCase;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class RequirementTestCase extends Pivot
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'requirement_test_case';

    /**
     * Indicates if the model should be timestamped.
     * The pivot only has created_at (set manually), no updated_at.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Requirement, $this>
     */
    public function requirement(): BelongsTo
    {
        return $this->belongsTo(Requirement::class);
    }

    /**
     * @return BelongsTo<TestCase, $this>
     */
    public function test_case(): BelongsTo
    {
        return $this->belongsTo(TestCase::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
