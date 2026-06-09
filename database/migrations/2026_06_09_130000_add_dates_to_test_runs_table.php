<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('test_runs', function (Blueprint $table) {
            $table->date('start_on')->nullable()->after('refs');
            $table->date('end_on')->nullable()->after('start_on');
        });
    }

    public function down(): void
    {
        Schema::table('test_runs', function (Blueprint $table) {
            $table->dropColumn(['start_on', 'end_on']);
        });
    }
};
