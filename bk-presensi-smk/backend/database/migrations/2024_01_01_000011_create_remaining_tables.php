<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_followups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_id')->constrained('complaints')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('followup_type', 50);
            $table->text('notes');
            $table->boolean('parent_visible')->default(false);
            $table->timestamp('followed_up_at');
            $table->timestamps();

            $table->index('complaint_id');
        });

        Schema::create('telegram_parents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('telegram_id')->unique();
            $table->string('parent_name', 150);
            $table->boolean('is_verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('last_interaction_at')->nullable();
            $table->timestamps();
        });

        Schema::create('parent_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->constrained('telegram_parents')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->restrictOnDelete();
            $table->string('relationship_type', 50)->nullable();
            $table->timestamp('verified_at');
            $table->string('verification_method', 50);
            $table->timestamps();

            $table->unique(['parent_id', 'student_id']);
        });

        Schema::create('parent_verification_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->restrictOnDelete();
            $table->string('code_hash', 255);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('issued_by')->constrained('users')->restrictOnDelete();
            $table->unsignedSmallInteger('attempts_count')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['student_id', 'expires_at']);
        });

        Schema::create('telegram_notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('telegram_parents')->nullOnDelete();
            $table->foreignId('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->string('notification_type', 80);
            $table->string('related_record_type', 80)->nullable();
            $table->unsignedBigInteger('related_record_id')->nullable();
            $table->string('idempotency_key', 100)->unique()->nullable();
            $table->enum('delivery_status', ['pending', 'sent', 'failed', 'retry']);
            $table->unsignedSmallInteger('attempt_count')->default(0);
            $table->string('last_error_code', 50)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['parent_id', 'notification_type']);
            $table->index('delivery_status');
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 100);
            $table->string('entity_type', 80);
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('request_id', 100)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['entity_type', 'entity_id']);
            $table->index('user_id');
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('telegram_notification_logs');
        Schema::dropIfExists('parent_verification_codes');
        Schema::dropIfExists('parent_students');
        Schema::dropIfExists('telegram_parents');
        Schema::dropIfExists('case_followups');
    }
};
