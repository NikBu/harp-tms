<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_run_configs', function (Blueprint $table) {
            $table->foreignId('test_run_id')->constrained('test_runs')->cascadeOnDelete();
            $table->foreignId('configuration_id')->constrained()->cascadeOnDelete();
            $table->primary(['test_run_id', 'configuration_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_run_configs');
    }
};
