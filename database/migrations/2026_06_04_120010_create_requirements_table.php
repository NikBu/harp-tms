<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('folder_id')->nullable()->constrained('requirement_folders')->nullOnDelete();
            $table->string('display_id'); // e.g. "REQ-042"
            $table->string('title');
            $table->text('description')->nullable(); // rich text stored as HTML/Markdown
            $table->string('type')->default('functional'); // functional, non_functional, business, constraint, user_story
            $table->string('priority')->default('medium'); // critical, high, medium, low
            $table->string('status')->default('draft'); // draft, under_review, approved, obsolete
            $table->string('source')->default('manual'); // manual, jira, azure_devops, imported
            $table->string('external_ref')->nullable(); // e.g. "PROJ-42"
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->jsonb('tags')->nullable(); // array of strings // GIN index to be added via raw SQL in a separate migration if needed
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['project_id', 'display_id']);
            $table->index(['project_id', 'status']);
            $table->index('type');
            $table->index('priority');
            $table->index('folder_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requirements');
    }
};
