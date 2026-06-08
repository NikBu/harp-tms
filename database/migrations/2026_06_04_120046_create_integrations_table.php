<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained()->cascadeOnDelete(); // null = instance-level
            $table->string('integration_type'); // jira, github, gitlab, azure_devops, etc.
            $table->string('name');
            $table->jsonb('config'); // base_url, project_key, etc.
            $table->text('credentials')->nullable(); // encrypted JSON (API keys, tokens)
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integrations');
    }
};
