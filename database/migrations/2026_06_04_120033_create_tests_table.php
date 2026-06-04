<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('run_id')->constrained('test_runs')->cascadeOnDelete();
            $table->foreignId('case_id')->constrained('test_cases')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('untested'); // current rolled-up status
            $table->jsonb('case_snapshot')->nullable(); // frozen snapshot of case at run close // GIN index to be added via raw SQL in a separate migration if needed
            $table->timestamps();

            $table->index(['run_id', 'status']);
            $table->index('assigned_to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tests');
    }
};
