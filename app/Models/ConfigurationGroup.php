<?php

namespace App\Models;

use Database\Factories\ConfigurationGroupFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'name'])]
class ConfigurationGroup extends Model
{
    /** @use HasFactory<ConfigurationGroupFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return HasMany<Configuration, $this>
     */
    public function configurations(): HasMany
    {
        return $this->hasMany(Configuration::class, 'group_id');
    }
}
