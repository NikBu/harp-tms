<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_case_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_case_id')->constrained()->cascadeOnDelete();
            $table->jsonb('snapshot'); // full serialized test case state at this version
            $table->foreignId('changed_by')->constrained('users')->cascadeOnDelete();
            $table->jsonb('changed_fields')->nullable(); // list of changed field names
            $table->string('change_note')->nullable();
            $table->timestamp('created_at')->useCurrent();
            // Immutable — no updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_case_history');
    }
};
