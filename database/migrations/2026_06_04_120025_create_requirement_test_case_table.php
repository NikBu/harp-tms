<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requirement_test_case', function (Blueprint $table) {
            $table->foreignId('requirement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('test_case_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->primary(['requirement_id', 'test_case_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requirement_test_case');
    }
};
