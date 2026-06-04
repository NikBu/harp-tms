<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('suite_id')->constrained()->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->string('title');
            $table->string('template')->default('steps'); // steps, text, exploratory, bdd, checklist
            $table->string('case_type')->nullable(); // functional, regression, performance, usability, acceptance
            $table->string('priority')->nullable(); // critical, high, medium, low
            $table->unsignedInteger('estimate')->nullable(); // in seconds
            $table->unsignedInteger('estimate_forecast')->nullable(); // computed/cached
            $table->text('preconditions')->nullable();
            $table->text('expected_result')->nullable(); // for text-template cases
            $table->string('refs')->nullable(); // external req/ticket IDs freeform
            $table->unsignedSmallInteger('automation_type')->default(0); // 0=none, 1=automation
            $table->string('automation_id')->nullable();
            $table->string('status')->default('draft'); // draft, review, approved
            $table->jsonb('checklist_items')->nullable(); // [{label, is_optional}] // GIN index to be added via raw SQL in a separate migration if needed
            $table->text('bdd_scenario')->nullable(); // raw Gherkin text for BDD template
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('display_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['suite_id', 'status']);
            $table->index('section_id');
            $table->index('template');
            $table->index('priority');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_cases');
    }
};
