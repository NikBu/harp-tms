<?php

namespace App\Models;

use Database\Factories\SharedStepItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['shared_step_id', 'step_index', 'content', 'expected'])]
class SharedStepItem extends Model
{
    /** @use HasFactory<SharedStepItemFactory> */
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
     * @return BelongsTo<SharedStep, $this>
     */
    public function sharedStep(): BelongsTo
    {
        return $this->belongsTo(SharedStep::class);
    }
}
