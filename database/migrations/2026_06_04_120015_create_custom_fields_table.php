<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_fields', function (Blueprint $table) {
            $table->id();
            $table->string('system_name')->unique(); // internal identifier, immutable
            $table->string('label');
            $table->text('description')->nullable();
            $table->string('field_type'); // string, integer, text, url, checkbox, dropdown, user, date, milestone, steps, step_results, multi_select
            $table->string('applies_to'); // cases, results
            $table->boolean('is_global')->default(false); // if true, applies to all projects
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_fields');
    }
};
