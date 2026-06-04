<?php

namespace App\Models;

use Database\Factories\TestPlanEntryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['plan_id', 'run_id', 'assigned_to'])]
class TestPlanEntry extends Model
{
    /** @use HasFactory<TestPlanEntryFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<TestPlan, $this>
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(TestPlan::class, 'plan_id');
    }

    /**
     * @return BelongsTo<TestRun, $this>
     */
    public function run(): BelongsTo
    {
        return $this->belongsTo(TestRun::class, 'run_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * @return BelongsToMany<Configuration, $this>
     */
    public function configurations(): BelongsToMany
    {
        return $this->belongsToMany(Configuration::class, 'test_plan_entry_configs');
    }
}
