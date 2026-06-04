<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['test_case_id', 'dataset_name', 'values', 'display_order'])]
class TestCaseParameterDataset extends Model
{
    /** @use HasFactory<\Database\Factories\TestCaseParameterDatasetFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'values' => 'array',
            'display_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<TestCase, $this>
     */
    public function testCase(): BelongsTo
    {
        return $this->belongsTo(TestCase::class);
    }
}
