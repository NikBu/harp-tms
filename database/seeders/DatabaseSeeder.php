<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            TechnicalSeeder::class,
            // Uncomment to seed demo data for presentations
            // DemoSeeder::class,
            BetaGammaSeeder::class,
            DefectSeeder::class,
            DemoSeeder::class,
        ]);
    }
}
