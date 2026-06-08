<?php

namespace App\Models;

use Database\Factories\TestResultChecklistItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['test_result_id', 'item_index', 'status', 'comment'])]
class TestResultChecklistItem extends Model
{
    /** @use HasFactory<TestResultChecklistItemFactory> */
    use HasFactory;

    public $timestamps = false;

    public const STATUSES = ['passed', 'failed', 'na', 'untested'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'item_index' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<TestResult, $this>
     */
    public function testResult(): BelongsTo
    {
        return $this->belongsTo(TestResult::class);
    }
}
