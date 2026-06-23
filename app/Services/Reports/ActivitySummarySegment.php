<?php

namespace App\Services\Reports;

use App\Models\Project;
use App\Models\TestCase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Activity Summary segment.
 *
 * Returns:
 *  - daily[]  — per-day counts of new test cases created + test results logged (last 30 days)
 *  - totals   — aggregate new_cases / new_results / updated_cases over the window
 */
class ActivitySummarySegment
{
    /**
     * @param  Collection<int, Project>|list<int>  $projectIds
     * @return array<string, mixed>
     */
    public function compute(array $projectIds): array
    {
        if ($projectIds === []) {
            return $this->empty();
        }

        $since = Carbon::today()->subDays(29);

        // New test cases created per day
        $newCasesRaw = TestCase::query()
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->whereIn('suites.project_id', $projectIds)
            ->where('test_cases.created_at', '>=', $since)
            ->selectRaw('DATE(test_cases.created_at) as day, count(*) as cnt')
            ->groupBy('day')
            ->pluck('cnt', 'day');

        // Results logged per day
        $newResultsRaw = DB::table('test_results')
            ->join('test_runs', 'test_results.run_id', '=', 'test_runs.id')
            ->whereIn('test_runs.project_id', $projectIds)
            ->where('test_results.created_at', '>=', $since)
            ->selectRaw('DATE(test_results.created_at) as day, count(*) as cnt')
            ->groupBy('day')
            ->pluck('cnt', 'day');

        // Test cases updated per day
        $updatedCasesRaw = TestCase::query()
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->whereIn('suites.project_id', $projectIds)
            ->where('test_cases.updated_at', '>=', $since)
            ->whereColumn('test_cases.created_at', '!=', 'test_cases.updated_at')
            ->selectRaw('DATE(test_cases.updated_at) as day, count(*) as cnt')
            ->groupBy('day')
            ->pluck('cnt', 'day');

        $daily = [];
        for ($i = 0; $i < 30; $i++) {
            $day = $since->copy()->addDays($i)->toDateString();
            $daily[] = [
                'date' => $day,
                'new_cases' => (int) ($newCasesRaw[$day] ?? 0),
                'new_results' => (int) ($newResultsRaw[$day] ?? 0),
                'updated_cases' => (int) ($updatedCasesRaw[$day] ?? 0),
            ];
        }

        $totals = [
            'new_cases' => (int) $newCasesRaw->sum(),
            'new_results' => (int) $newResultsRaw->sum(),
            'updated_cases' => (int) $updatedCasesRaw->sum(),
        ];

        return compact('daily', 'totals');
    }

    /** @return array<string, mixed> */
    private function empty(): array
    {
        return [
            'daily' => [],
            'totals' => ['new_cases' => 0, 'new_results' => 0, 'updated_cases' => 0],
        ];
    }
}
