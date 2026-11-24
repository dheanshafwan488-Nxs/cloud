<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('telegram_parents', function (Blueprint $table) {
            $table->string('username', 100)->nullable()->after('parent_name')->index();
        });
    }

    public function down(): void
    {
        Schema::table('telegram_parents', function (Blueprint $table) {
            $table->dropColumn('username');
        });
    }
};
