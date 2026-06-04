<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_run_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_run_id')->constrained('test_runs')->cascadeOnDelete();
            $table->foreignId('test_case_id')->constrained('test_cases')->cascadeOnDelete();

            $table->unique(['test_run_id', 'test_case_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_run_cases');
    }
};
