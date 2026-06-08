<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_case_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_case_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('step_index');
            $table->text('content'); // the action/step
            $table->text('expected')->nullable(); // expected result for this step
            $table->foreignId('shared_step_id')->nullable()->constrained('shared_steps')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_case_steps');
    }
};
