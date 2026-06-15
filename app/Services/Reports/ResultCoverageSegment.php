<?php

namespace App\Services\Reports;

use App\Models\TestCase;
use App\Models\TestResult;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Result Coverage segment.
 *
 * Returns:
 *  - status totals (passed / failed / blocked / retest / skipped / untested)
 *  - run_count
 *  - coverage { total, run, untested, pct }
 *  - by_priority { critical, high, medium, low } pass rates
 */
class ResultCoverageSegment
{
    /**
     * @param  list<int>  $projectIds
     * @return array<string, mixed>
     */
    public function compute(array $projectIds): array
    {
        if ($projectIds === []) {
            return $this->empty();
        }

        $runs = DB::table('test_runs')
            ->whereIn('project_id', $projectIds)
            ->get(['id', 'passed_count', 'failed_count', 'blocked_count',
                   'untested_count', 'retest_count', 'skipped_count']);

        $passed   = (int) $runs->sum('passed_count');
        $failed   = (int) $runs->sum('failed_count');
        $blocked  = (int) $runs->sum('blocked_count');
        $untested = (int) $runs->sum('untested_count');
        $retest   = (int) $runs->sum('retest_count');
        $skipped  = (int) $runs->sum('skipped_count');

        $totalCases = TestCase::query()
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->whereIn('suites.project_id', $projectIds)
            ->count();

        $casesRun = TestResult::query()
            ->join('test_runs', 'test_results.run_id', '=', 'test_runs.id')
            ->whereIn('test_runs.project_id', $projectIds)
            ->distinct('test_results.case_id')
            ->count('test_results.case_id');

        $casesRun  = min($casesRun, $totalCases);
        $neverRun  = max($totalCases - $casesRun, 0);

        // Pass rate by priority
        $byPriority = $this->passByPriority($projectIds);

        return [
            'passed'    => $passed,
            'failed'    => $failed,
            'blocked'   => $blocked,
            'untested'  => $untested,
            'retest'    => $retest,
            'skipped'   => $skipped,
            'run_count' => $runs->count(),
            'coverage'  => [
                'total'    => $totalCases,
                'run'      => $casesRun,
                'untested' => $neverRun,
                'pct'      => $totalCases > 0
                    ? round(($casesRun / $totalCases) * 100, 1)
                    : 0.0,
            ],
            'by_priority' => $byPriority,
        ];
    }

    /**
     * @param  list<int>  $projectIds
     * @return array<string, array{passed: int, total: int, pct: float}>
     */
    private function passByPriority(array $projectIds): array
    {
        $rows = DB::table('test_results')
            ->join('test_runs', 'test_results.run_id', '=', 'test_runs.id')
            ->join('test_cases', 'test_results.case_id', '=', 'test_cases.id')
            ->whereIn('test_runs.project_id', $projectIds)
            ->selectRaw('test_cases.priority, test_results.status, count(*) as cnt')
            ->groupBy('test_cases.priority', 'test_results.status')
            ->get();

        $result = [];
        foreach (['critical', 'high', 'medium', 'low'] as $p) {
            $pRows  = $rows->where('priority', $p);
            $total  = (int) $pRows->sum('cnt');
            $passed = (int) $pRows->where('status', 'passed')->sum('cnt');
            $result[$p] = [
                'passed' => $passed,
                'total'  => $total,
                'pct'    => $total > 0 ? round(($passed / $total) * 100, 1) : 0.0,
            ];
        }

        return $result;
    }

    /** @return array<string, mixed> */
    private function empty(): array
    {
        $byPriority = [];
        foreach (['critical', 'high', 'medium', 'low'] as $p) {
            $byPriority[$p] = ['passed' => 0, 'total' => 0, 'pct' => 0.0];
        }

        return [
            'passed' => 0, 'failed' => 0, 'blocked' => 0,
            'untested' => 0, 'retest' => 0, 'skipped' => 0,
            'run_count'   => 0,
            'coverage'    => ['total' => 0, 'run' => 0, 'untested' => 0, 'pct' => 0.0],
            'by_priority' => $byPriority,
        ];
    }
}
