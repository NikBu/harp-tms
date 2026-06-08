<?php

namespace App\Models;

use Database\Factories\CustomFieldFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

#[Fillable(['system_name', 'label', 'description', 'field_type', 'applies_to', 'is_global', 'created_by'])]
class CustomField extends Model
{
    /** @use HasFactory<CustomFieldFactory> */
    use HasFactory, LogsActivity;

    public const FIELD_TYPES = ['string', 'integer', 'text', 'url', 'checkbox', 'dropdown', 'user', 'date', 'milestone', 'steps', 'step_results', 'multi_select'];

    public const APPLIES_TO = ['cases', 'results'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_global' => 'boolean',
        ];
    }

    /**
     * Get Activity log options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly([
            'system_name', 'label', 'description', 'field_type', 'applies_to', 'is_global',
        ]);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<CustomFieldOption, $this>
     */
    public function options(): HasMany
    {
        return $this->hasMany(CustomFieldOption::class)->orderBy('display_order');
    }

    /**
     * @return BelongsToMany<Project, $this>
     */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'custom_field_project')
            ->withPivot('is_required', 'display_order', 'default_value');
    }

    /**
     * @return HasMany<TestCaseCustomValue, $this>
     */
    public function testCaseValues(): HasMany
    {
        return $this->hasMany(TestCaseCustomValue::class);
    }

    /**
     * @return HasMany<TestResultCustomValue, $this>
     */
    public function testResultValues(): HasMany
    {
        return $this->hasMany(TestResultCustomValue::class);
    }
}
