<?php

namespace App\Models;

use Database\Factories\RequirementCommentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['requirement_id', 'parent_id', 'user_id', 'body'])]
class RequirementComment extends Model
{
    /** @use HasFactory<RequirementCommentFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Requirement, $this>
     */
    public function requirement(): BelongsTo
    {
        return $this->belongsTo(Requirement::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<RequirementComment, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(RequirementComment::class, 'parent_id');
    }

    /**
     * @return HasMany<RequirementComment, $this>
     */
    public function replies(): HasMany
    {
        return $this->hasMany(RequirementComment::class, 'parent_id');
    }
}
