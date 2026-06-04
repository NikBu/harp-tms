<?php

namespace App\Models;

use Database\Factories\TestResultCustomValueFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['test_result_id', 'custom_field_id', 'value_string', 'value_integer', 'value_text', 'value_boolean', 'value_json'])]
class TestResultCustomValue extends Model
{
    /** @use HasFactory<TestResultCustomValueFactory> */
    use HasFactory;

    public $timestamps = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value_boolean' => 'boolean',
            'value_integer' => 'integer',
            'value_json' => 'array',
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
     * @return BelongsTo<CustomField, $this>
     */
    public function customField(): BelongsTo
    {
        return $this->belongsTo(CustomField::class);
    }
}
