<?php

namespace App\Models;

use Database\Factories\SectionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['suite_id', 'parent_id', 'name', 'description', 'depth', 'display_order'])]
class Section extends Model
{
    /** @use HasFactory<SectionFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'depth' => 'integer',
            'display_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Suite, $this>
     */
    public function suite(): BelongsTo
    {
        return $this->belongsTo(Suite::class);
    }

    /**
     * @return BelongsTo<Section, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'parent_id');
    }

    /**
     * @return HasMany<Section, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(Section::class, 'parent_id');
    }

    /**
     * @return HasMany<TestCase, $this>
     */
    public function testCases(): HasMany
    {
        return $this->hasMany(TestCase::class);
    }
}
