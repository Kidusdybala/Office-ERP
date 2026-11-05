<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('employee_id')->unique()->nullable()->after('id');
            $table->enum('role', ['admin', 'manager', 'employee'])->default('employee')->after('employee_id');
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete()->after('role');
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete()->after('department_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
            $table->dropConstrainedForeignId('manager_id');
            $table->dropColumn(['employee_id', 'role']);
        });
    }
};
