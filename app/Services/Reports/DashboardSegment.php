<?php

namespace App\Services\Reports;

use App\Models\Project;
use App\Models\TestCase;
use App\Models\TestResult;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard orchestrator — aggregates all sections for the main Reports dashboard.
 */
class DashboardSegment
{
    public function __construct(
        private readonly ActivitySummarySegment $activity,
        private readonly ResultCoverageSegment $coverage,
        private readonly MilestoneProgressSegment $milestones,
        private readonly WorkloadSegment $workload,
    ) {}

    /**
     * @param  Collection<int, Project>  $projects
     * @return array<string, mixed>
     */
    public function compute(Collection $projects): array
    {
        $projectIds = $projects->pluck('id')->all();

        if ($projectIds === []) {
            return $this->empty();
        }

        $statuses = ['passed', 'failed', 'blocked', 'untested', 'retest', 'skipped'];

        // ── Run summary ──────────────────────────────────────────────────────
        $runs = DB::table('test_runs')
            ->whereIn('project_id', $projectIds)
            ->orderByDesc('created_at')
            ->get([
                'id', 'name', 'is_completed', 'created_at',
                'passed_count', 'failed_count', 'blocked_count',
                'untested_count', 'retest_count', 'skipped_count',
            ]);

        $statusTotals = [
            'passed' => (int) $runs->sum('passed_count'),
            'failed' => (int) $runs->sum('failed_count'),
            'blocked' => (int) $runs->sum('blocked_count'),
            'untested' => (int) $runs->sum('untested_count'),
            'retest' => (int) $runs->sum('retest_count'),
            'skipped' => (int) $runs->sum('skipped_count'),
        ];

        $runRows = $runs->map(function ($run): array {
            $breakdown = [
                'passed' => (int) $run->passed_count,
                'failed' => (int) $run->failed_count,
                'blocked' => (int) $run->blocked_count,
                'untested' => (int) $run->untested_count,
                'retest' => (int) $run->retest_count,
                'skipped' => (int) $run->skipped_count,
            ];
            $total = array_sum($breakdown);

            return [
                'id' => $run->id,
                'name' => $run->name,
                'is_completed' => (bool) $run->is_completed,
                'created_at' => $run->created_at,
                'total' => $total,
                'breakdown' => $breakdown,
                'pct_passed' => $total > 0 ? round(($breakdown['passed'] / $total) * 100, 1) : 0.0,
            ];
        })->values()->all();

        // ── Activity (last 30 days) ──────────────────────────────────────────
        $since = Carbon::today()->subDays(29);

        $activityRaw = TestResult::query()
            ->join('test_runs', 'test_results.run_id', '=', 'test_runs.id')
            ->whereIn('test_runs.project_id', $projectIds)
            ->where('test_results.created_at', '>=', $since)
            ->selectRaw('DATE(test_results.created_at) as day, test_results.status as status, count(*) as cnt')
            ->groupBy('day', 'status')
            ->get();

        $activity = [];
        for ($i = 0; $i < 30; $i++) {
            $day = $since->copy()->addDays($i)->toDateString();
            $row = ['date' => $day];
            foreach ($statuses as $s) {
                $row[$s] = 0;
            }
            $activity[$day] = $row;
        }
        foreach ($activityRaw as $entry) {
            $day = (string) $entry->day;
            $status = (string) $entry->status;
            if (isset($activity[$day]) && in_array($status, $statuses, true)) {
                $activity[$day][$status] = (int) $entry->cnt;
            }
        }
        $activity = array_values($activity);

        // ── Coverage ────────────────────────────────────────────────────────
        $totalCases = TestCase::query()
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->whereIn('suites.project_id', $projectIds)
            ->count();

        $casesRun = TestResult::query()
            ->join('test_runs', 'test_results.run_id', '=', 'test_runs.id')
            ->whereIn('test_runs.project_id', $projectIds)
            ->distinct('test_results.case_id')
            ->count('test_results.case_id');

        $casesRun = min($casesRun, $totalCases);
        $neverRun = max($totalCases - $casesRun, 0);

        $testedCaseIds = TestResult::query()
            ->join('test_runs', 'test_results.run_id', '=', 'test_runs.id')
            ->whereIn('test_runs.project_id', $projectIds)
            ->distinct()
            ->pluck('test_results.case_id')
            ->all();
        $testedSet = array_fill_keys($testedCaseIds, true);

        $sectionRaw = DB::table('test_cases')
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->leftJoin('sections', 'test_cases.section_id', '=', 'sections.id')
            ->whereIn('suites.project_id', $projectIds)
            ->get(['test_cases.id as case_id', 'sections.name as section_name']);

        $sectionCoverage = [];
        $defaultSection = __('sections.default_name');
        foreach ($sectionRaw as $r) {
            $name = $r->section_name ?? $defaultSection;
            if (! isset($sectionCoverage[$name])) {
                $sectionCoverage[$name] = ['section' => $name, 'tested' => 0, 'untested' => 0];
            }
            if (isset($testedSet[$r->case_id])) {
                $sectionCoverage[$name]['tested']++;
            } else {
                $sectionCoverage[$name]['untested']++;
            }
        }
        $sectionCoverage = collect(array_values($sectionCoverage))
            ->sortByDesc(fn ($s) => $s['tested'] + $s['untested'])
            ->take(15)
            ->values()
            ->all();

        // ── Milestones ───────────────────────────────────────────────────────
        $milestoneData = $this->milestones->compute($projectIds);

        // ── Workload ─────────────────────────────────────────────────────────
        $workloadData = $this->workload->compute($projectIds);
        $workload = array_map(fn ($m) => [
            'user_id' => $m['user_id'],
            'name' => $m['name'],
            'assigned_cases' => $m['assigned_cases'],
            'results_logged' => $m['results_logged'],
        ], $workloadData['members']);

        return [
            'statusTotals' => $statusTotals,
            'runs' => $runRows,
            'activity' => $activity,
            'coverage' => [
                'total' => $totalCases,
                'run' => $casesRun,
                'untested' => $neverRun,
                'pct' => $totalCases > 0 ? round(($casesRun / $totalCases) * 100, 1) : 0.0,
            ],
            'sectionCoverage' => $sectionCoverage,
            'milestones' => $milestoneData['milestones'],
            'workload' => $workload,
            'hasMilestones' => count($milestoneData['milestones']) > 0,
        ];
    }

    /** @return array<string, mixed> */
    private function empty(): array
    {
        return [
            'statusTotals' => ['passed' => 0, 'failed' => 0, 'blocked' => 0, 'untested' => 0, 'retest' => 0, 'skipped' => 0],
            'runs' => [],
            'activity' => [],
            'coverage' => ['total' => 0, 'run' => 0, 'untested' => 0, 'pct' => 0.0],
            'sectionCoverage' => [],
            'milestones' => [],
            'workload' => [],
            'hasMilestones' => false,
        ];
    }
}
