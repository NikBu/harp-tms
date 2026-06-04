<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_case_parameters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_case_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // parameter name e.g. "username"
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_case_parameters');
    }
};
