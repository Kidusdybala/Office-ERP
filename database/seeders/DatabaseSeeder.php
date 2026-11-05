<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Department;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $dept = Department::create(['name' => 'IT Department']);
        
        $manager = User::factory()->create([
            'name' => 'Admin Manager',
            'email' => 'manager@erp.local',
            'password' => Hash::make('password'),
            'role' => 'manager',
            'department_id' => $dept->id,
        ]);
        
        User::factory()->create([
            'name' => 'Test Employee',
            'email' => 'employee@erp.local',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'department_id' => $dept->id,
            'manager_id' => $manager->id,
        ]);
    }
}
