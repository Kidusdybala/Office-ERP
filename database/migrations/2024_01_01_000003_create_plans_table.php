<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('plan_date');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'missed'])->default('pending');
            $table->timestamps();

            $table->index(['user_id', 'plan_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
