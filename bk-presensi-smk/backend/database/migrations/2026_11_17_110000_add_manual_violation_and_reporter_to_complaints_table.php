<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->string('reporter_name', 150)->nullable()->after('reported_by_user_id');
            $table->string('manual_violation', 255)->nullable()->after('chronology');
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn(['reporter_name', 'manual_violation']);
        });
    }
};
