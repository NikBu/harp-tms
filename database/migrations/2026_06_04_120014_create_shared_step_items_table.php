<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shared_step_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shared_step_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('step_index');
            $table->text('content');
            $table->text('expected')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shared_step_items');
    }
};
