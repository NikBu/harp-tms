<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('defect_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_result_id')->constrained()->cascadeOnDelete();
            $table->string('tracker_type'); // jira, github, gitlab, azure_devops, bugzilla, linear, etc.
            $table->string('external_id'); // e.g. "PROJ-123" or numeric issue ID
            $table->string('external_url')->nullable();
            $table->string('title')->nullable(); // cached display title
            $table->string('status')->nullable(); // cached live status
            $table->jsonb('cached_metadata')->nullable(); // assignee, priority, labels etc.
            $table->timestamp('cache_refreshed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            // No updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('defect_links');
    }
};
