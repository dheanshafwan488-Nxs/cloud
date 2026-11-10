<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nis', 20)->unique();
            $table->string('nisn', 10)->nullable()->unique();
            $table->string('name', 150);
            $table->enum('gender', ['L', 'P'])->nullable();
            $table->date('birth_date')->nullable();
            $table->foreignId('class_id')->constrained('classes')->restrictOnDelete();
            $table->enum('enrollment_status', ['aktif', 'lulus', 'pindah', 'nonaktif'])->default('aktif');
            $table->timestamps();
            $table->softDeletes();

            $table->index('class_id');
            $table->index('enrollment_status');
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
