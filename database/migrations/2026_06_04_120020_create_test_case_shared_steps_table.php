<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_case_shared_steps', function (Blueprint $table) {
            $table->foreignId('test_case_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shared_step_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position'); // where in the step sequence this block is inserted
            $table->primary(['test_case_id', 'shared_step_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_case_shared_steps');
    }
};
