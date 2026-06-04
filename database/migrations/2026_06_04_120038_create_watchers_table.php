<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('watchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('watchable_type'); // test_case, test_run, project, requirement
            $table->unsignedBigInteger('watchable_id');
            $table->timestamps();

            $table->unique(['user_id', 'watchable_type', 'watchable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('watchers');
    }
};
