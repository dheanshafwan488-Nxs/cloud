<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parent_verification_codes', function (Blueprint $table) {
            $table->string('plain_code', 20)->nullable()->after('code_hash');
        });
    }

    public function down(): void
    {
        Schema::table('parent_verification_codes', function (Blueprint $table) {
            $table->dropColumn('plain_code');
        });
    }
};
