<?php

namespace App\Models;

use Database\Factories\TestCaseStepFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['test_case_id', 'step_index', 'content', 'expected', 'shared_step_id'])]
class TestCaseStep extends Model
{
    /** @use HasFactory<TestCaseStepFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'step_index' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<TestCase, $this>
     */
    public function testCase(): BelongsTo
    {
        return $this->belongsTo(TestCase::class);
    }

    /**
     * @return BelongsTo<SharedStep, $this>
     */
    public function sharedStep(): BelongsTo
    {
        return $this->belongsTo(SharedStep::class);
    }
}
