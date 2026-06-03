<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;


class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
   public function run(): void
{
    app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

    // Permissions
    $permissions = [
        'project.view', 'project.create', 'project.edit', 'project.delete',
        'testcase.view', 'testcase.create', 'testcase.edit', 'testcase.delete',
        'testplan.view', 'testplan.create', 'testplan.edit', 'testplan.delete',
        'testrun.view', 'testrun.create', 'testrun.execute',
        'defect.view', 'defect.create', 'defect.edit',
        'report.view',
        'admin.access',
    ];
    foreach ($permissions as $p) {
        Permission::create(['name' => $p]);
    }

    // Roles
    Role::create(['name' => 'admin'])->givePermissionTo(Permission::all());
    Role::create(['name' => 'test-lead'])->givePermissionTo([
        'project.view',
        'testcase.view', 'testcase.create', 'testcase.edit', 'testcase.delete',
        'testplan.view', 'testplan.create', 'testplan.edit', 'testplan.delete',
        'testrun.view', 'testrun.create', 'testrun.execute',
        'defect.view', 'defect.create', 'defect.edit',
        'report.view',
    ]);
    Role::create(['name' => 'tester'])->givePermissionTo([
        'project.view', 'testcase.view', 'testplan.view', 'testrun.view', 'testrun.execute', 'defect.view', 'defect.create',
    ]);
    Role::create(['name' => 'viewer'])->givePermissionTo([
        'project.view', 'testcase.view', 'testplan.view', 'testrun.view', 'report.view',
    ]);
}
}
