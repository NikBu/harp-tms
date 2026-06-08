<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained()->cascadeOnDelete(); // null = cross-project
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('report_type');
            $table->jsonb('filters')->nullable();
            $table->boolean('is_scheduled')->default(false);
            $table->string('schedule_cron')->nullable();
            $table->jsonb('schedule_recipients')->nullable();
            $table->string('access_level')->default('private'); // private, project_team, public
            $table->string('public_token')->nullable()->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_reports');
    }
};
