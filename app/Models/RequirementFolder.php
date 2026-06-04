<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'parent_id', 'name', 'display_order'])]
class RequirementFolder extends Model
{
    /** @use HasFactory<\Database\Factories\RequirementFolderFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<RequirementFolder, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(RequirementFolder::class, 'parent_id');
    }

    /**
     * @return HasMany<RequirementFolder, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(RequirementFolder::class, 'parent_id');
    }

    /**
     * @return HasMany<Requirement, $this>
     */
    public function requirements(): HasMany
    {
        return $this->hasMany(Requirement::class);
    }
}
