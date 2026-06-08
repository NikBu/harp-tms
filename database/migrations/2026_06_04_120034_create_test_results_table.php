<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_id')->constrained('tests')->restrictOnDelete();
            $table->foreignId('run_id')->constrained('test_runs')->restrictOnDelete();
            $table->foreignId('case_id')->constrained('test_cases')->restrictOnDelete();
            $table->string('status'); // passed, failed, blocked, retest, skipped, untested
            $table->text('comment')->nullable();
            $table->unsignedInteger('elapsed')->nullable(); // seconds
            $table->string('version')->nullable(); // product version under test
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            // No updated_at — results are immutable append-only

            $table->index(['run_id', 'status']);
            $table->index('test_id');
            $table->index('case_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_results');
    }
};
