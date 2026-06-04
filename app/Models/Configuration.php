<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['group_id', 'name'])]
class Configuration extends Model
{
    /** @use HasFactory<\Database\Factories\ConfigurationFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<ConfigurationGroup, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(ConfigurationGroup::class, 'group_id');
    }

    /**
     * @return BelongsToMany<TestRun, $this>
     */
    public function testRuns(): BelongsToMany
    {
        return $this->belongsToMany(TestRun::class, 'test_run_configs');
    }

    /**
     * @return BelongsToMany<TestPlanEntry, $this>
     */
    public function testPlanEntries(): BelongsToMany
    {
        return $this->belongsToMany(TestPlanEntry::class, 'test_plan_entry_configs');
    }
}
