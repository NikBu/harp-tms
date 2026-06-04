<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_plan_entry_configs', function (Blueprint $table) {
            $table->foreignId('plan_entry_id')->constrained('test_plan_entries')->cascadeOnDelete();
            $table->foreignId('configuration_id')->constrained()->cascadeOnDelete();
            $table->primary(['plan_entry_id', 'configuration_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_plan_entry_configs');
    }
};
