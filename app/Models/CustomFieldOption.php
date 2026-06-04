<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['custom_field_id', 'option_key', 'option_label', 'display_order'])]
class CustomFieldOption extends Model
{
    /** @use HasFactory<\Database\Factories\CustomFieldOptionFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'option_key' => 'integer',
            'display_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<CustomField, $this>
     */
    public function customField(): BelongsTo
    {
        return $this->belongsTo(CustomField::class);
    }
}
