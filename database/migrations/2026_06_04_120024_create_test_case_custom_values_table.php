<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_case_custom_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_case_id')->constrained()->cascadeOnDelete();
            $table->foreignId('custom_field_id')->constrained()->cascadeOnDelete();
            $table->string('value_string')->nullable();
            $table->integer('value_integer')->nullable();
            $table->text('value_text')->nullable();
            $table->boolean('value_boolean')->nullable();
            $table->jsonb('value_json')->nullable(); // for multi_select, steps, milestone refs
            $table->timestamps();

            $table->unique(['test_case_id', 'custom_field_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_case_custom_values');
    }
};
