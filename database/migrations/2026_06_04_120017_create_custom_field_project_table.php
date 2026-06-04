<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_field_project', function (Blueprint $table) {
            $table->foreignId('custom_field_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_required')->default(false);
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->string('default_value')->nullable();
            $table->primary(['custom_field_id', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_field_project');
    }
};
