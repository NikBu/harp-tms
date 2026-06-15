<?php

namespace App\Services\Reports;

use App\Models\TestResult;
use Illuminate\Support\Facades\DB;

/**
 * Workload segment.
 *
 * Returns per-member:
 *  - assigned_cases  — test cases assigned to them in any run within the project(s)
 *  - results_logged  — test results they have submitted
 *  - pass_rate       — % of their results that are 'passed'
 *  - statuses        — breakdown { passed, failed, blocked, retest, skipped, untested }
 */
class WorkloadSegment
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

        // Assigned cases per user
        $assignedCounts = DB::table('test_cases')
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->whereIn('suites.project_id', $projectIds)
            ->whereNotNull('test_cases.assigned_to')
            ->selectRaw('test_cases.assigned_to as user_id, count(*) as cnt')
            ->groupBy('test_cases.assigned_to')
            ->pluck('cnt', 'user_id');

        // Results per user with status breakdown
        $resultRows = TestResult::query()
            ->join('test_runs', 'test_results.run_id', '=', 'test_runs.id')
            ->whereIn('test_runs.project_id', $projectIds)
            ->whereNotNull('test_results.created_by')
            ->selectRaw('test_results.created_by as user_id, test_results.status, count(*) as cnt')
            ->groupBy('test_results.created_by', 'test_results.status')
            ->get();

        $resultsByUser = $resultRows->groupBy('user_id');

        $userIds = collect($assignedCounts->keys())
            ->merge($resultsByUser->keys())
            ->unique()
            ->values();

        $userNames = DB::table('users')
            ->whereIn('id', $userIds->all())
            ->pluck('name', 'id');

        $statuses = ['passed', 'failed', 'blocked', 'retest', 'skipped', 'untested'];

        $members = $userIds->map(function ($id) use ($assignedCounts, $resultsByUser, $userNames, $statuses): array {
            $userResults = $resultsByUser->get($id) ?? collect();
            $totalResults = (int) $userResults->sum('cnt');
            $passedResults = (int) $userResults->where('status', 'passed')->sum('cnt');

            $breakdown = [];
            foreach ($statuses as $s) {
                $breakdown[$s] = (int) $userResults->where('status', $s)->sum('cnt');
            }

            return [
                'user_id'        => (int) $id,
                'name'           => $userNames[$id] ?? '—',
                'assigned_cases' => (int) ($assignedCounts[$id] ?? 0),
                'results_logged' => $totalResults,
                'pass_rate'      => $totalResults > 0
                    ? round(($passedResults / $totalResults) * 100, 1)
                    : 0.0,
                'statuses'       => $breakdown,
            ];
        })
            ->sortByDesc(fn ($w) => $w['assigned_cases'] + $w['results_logged'])
            ->values()
            ->all();

        return ['members' => $members];
    }

    /** @return array<string, mixed> */
    private function empty(): array
    {
        return ['members' => []];
    }
}
