<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['test_result_id', 'tracker_type', 'external_id', 'external_url', 'title', 'status', 'cached_metadata', 'cache_refreshed_at', 'created_by'])]
class DefectLink extends Model
{
    /** @use HasFactory<\Database\Factories\DefectLinkFactory> */
    use HasFactory;

    public $timestamps = false;

    public const CREATED_AT = 'created_at';

    public const UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cached_metadata' => 'array',
            'cache_refreshed_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<TestResult, $this>
     */
    public function testResult(): BelongsTo
    {
        return $this->belongsTo(TestResult::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
