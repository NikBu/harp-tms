<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_result_custom_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_result_id')->constrained()->cascadeOnDelete();
            $table->foreignId('custom_field_id')->constrained()->cascadeOnDelete();
            $table->string('value_string')->nullable();
            $table->integer('value_integer')->nullable();
            $table->text('value_text')->nullable();
            $table->boolean('value_boolean')->nullable();
            $table->jsonb('value_json')->nullable(); // GIN index to be added via raw SQL in a separate migration if needed
            $table->unique(['test_result_id', 'custom_field_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_result_custom_values');
    }
};
