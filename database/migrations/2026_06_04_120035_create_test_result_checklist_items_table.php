<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_result_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_result_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('item_index');
            $table->string('status')->default('untested'); // passed, failed, na, untested
            $table->text('comment')->nullable();
            // No timestamps — child of result
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_result_checklist_items');
    }
};
