<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_plan_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('test_plans')->cascadeOnDelete();
            $table->foreignId('run_id')->constrained('test_runs')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_plan_entries');
    }
};
