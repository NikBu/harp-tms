<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('test_plan_entry_configs', function (Blueprint $table) {
            $table->renameColumn('plan_entry_id', 'test_plan_entry_id');
        });
    }

    public function down(): void
    {
        Schema::table('test_plan_entry_configs', function (Blueprint $table) {
            $table->renameColumn('test_plan_entry_id', 'plan_entry_id');
        });
    }
};
