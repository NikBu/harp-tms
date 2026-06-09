<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\TestCase;
use App\Models\TestResult;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * Available report types.
     *
     * @var list<array{key: string, name: string, desc: string}>
     */
    private const REPORT_TYPES = [
        ['key' => 'activity_summary', 'name' => 'Activity Summary', 'desc' => 'New and updated test cases over time'],
        ['key' => 'result_coverage', 'name' => 'Result Coverage', 'desc' => 'Test case results across runs'],
        ['key' => 'defect_summary', 'name' => 'Defect Summary', 'desc' => 'Defects found across runs'],
        ['key' => 'milestone_progress', 'name' => 'Milestone Progress', 'desc' => 'Progress towards milestones'],
        ['key' => 'case_distribution', 'name' => 'Case Distribution', 'desc' => 'Cases by priority, type, section'],
    ];

    /**
     * List the available report types for the project.
     */
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        return Inertia::render('reports/index', [
            'project' => $project->only(['id', 'name']),
            'projects' => null,
            'reportTypes' => self::REPORT_TYPES,
            'isGlobal' => false,
            'dashboard' => $this->dashboardData(collect([$project])),
        ]);
    }

    /**
     * Global (no project context) report landing page.
     */
    public function globalIndex(Request $request): Response
    {
        $user = $request->user();

        $projects = $user->hasRole('admin')
            ? Project::orderBy('name')->get(['id', 'name'])
            : $user->projects()->orderBy('name')->get(['projects.id', 'projects.name']);

        return Inertia::render('reports/index', [
            'project' => null,
            'projects' => $projects,
            'reportTypes' => self::REPORT_TYPES,
            'isGlobal' => true,
            'dashboard' => $this->dashboardData($projects),
        ]);
    }

    /**
     * Aggregate one report type across several projects.
     */
    public function crossProject(Request $request): Response
    {
        $user = $request->user();

        $validated = $request->validate([
            'project_ids' => ['required', 'array', 'min:1'],
            'project_ids.*' => ['integer', 'exists:projects,id'],
            'type' => ['required', 'string'],
        ]);

        $report = collect(self::REPORT_TYPES)->firstWhere('key', $validated['type']);
        abort_if($report === null, 404);

        $projects = Project::whereIn('id', $validated['project_ids'])->get();

        $accessible = $projects->filter(function (Project $project) use ($user): bool {
            return $user->hasRole('admin')
                || $project->members()->whereKey($user->getKey())->exists();
        });

        $results = $accessible->mapWithKeys(fn (Project $project): array => [
            $project->name => $this->reportData($project, $validated['type']),
        ]);

        return Inertia::render('reports/cross-project', [
            'results' => $results,
            'report' => $report,
            'type' => $validated['type'],
            'projects' => $accessible->map->only(['id', 'name'])->values(),
        ]);
    }

    /**
     * Show a single report. Coverage / distribution reports get real counts.
     */
    public function show(Request $request, Project $project, string $type): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $report = collect(self::REPORT_TYPES)->firstWhere('key', $type);

        abort_if($report === null, 404);

        return Inertia::render('reports/show', [
            'project' => $project->only(['id', 'name']),
            'report' => $report,
            'data' => $this->reportData($project, $type),
        ]);
    }

    /**
     * Aggregate the full TestRail-style dashboard payload across the given projects.
     *
     * @param  Collection<int, Project>  $projects
     * @return array<string, mixed>
     */
    private function dashboardData(Collection $projects): array
    {
        $projectIds = $projects->pluck('id')->all();

        if ($projectIds === []) {
            return $this->emptyDashboard();
        }

        $statuses = ['passed', 'failed', 'blocked', 'untested', 'retest', 'skipped'];

        // ── Section A: Run summary ──────────────────────────────────────────
        $runs = DB::table('test_runs')
            ->whereIn('project_id', $projectIds)
            ->orderByDesc('created_at')
            ->get([
                'id', 'name', 'is_completed', 'created_at',
                'passed_count', 'failed_count', 'blocked_count',
                'untested_count', 'retest_count', 'skipped_count',
            ]);

        $statusTotals = [
            'passed'   => (int) $runs->sum('passed_count'),
            'failed'   => (int) $runs->sum('failed_count'),
            'blocked'  => (int) $runs->sum('blocked_count'),
            'untested' => (int) $runs->sum('untested_count'),
            'retest'   => (int) $runs->sum('retest_count'),
            'skipped'  => (int) $runs->sum('skipped_count'),
        ];

        $runRows = $runs->map(function ($run): array {
            $breakdown = [
                'passed'   => (int) $run->passed_count,
                'failed'   => (int) $run->failed_count,
                'blocked'  => (int) $run->blocked_count,
                'untested' => (int) $run->untested_count,
                'retest'   => (int) $run->retest_count,
                'skipped'  => (int) $run->skipped_count,
            ];
            $total = array_sum($breakdown);

            return [
                'id'         => $run->id,
                'name'       => $run->name,
                'is_completed' => (bool) $run->is_completed,
                'created_at' => $run->created_at,
                'total'      => $total,
                'breakdown'  => $breakdown,
                'pct_passed' => $total > 0 ? round(($breakdown['passed'] / $total) * 100, 1) : 0.0,
            ];
        })->values()->all();

        // ── Section B: Activity over time (last 30 days) ────────────────────
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

        // ── Section C: Case coverage ────────────────────────────────────────
        $totalCases = TestCase::query()
            ->whereHas('suite', fn ($q) => $q->whereIn('project_id', $projectIds))
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

        $sectionTestedRaw = DB::table('test_cases')
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->leftJoin('sections', 'test_cases.section_id', '=', 'sections.id')
            ->whereIn('suites.project_id', $projectIds)
            ->get(['test_cases.id as case_id', 'sections.name as section_name']);

        $sectionCoverage = [];
        $defaultSection = __('app.sections.default_name');
        foreach ($sectionTestedRaw as $r) {
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

        // ── Section D: Milestone progress ───────────────────────────────────
        $milestones = DB::table('milestones')
            ->whereIn('project_id', $projectIds)
            ->orderBy('due_on')
            ->get(['id', 'name', 'due_on', 'is_completed']);

        $milestoneRows = $milestones->map(function ($m): array {
            $runStats = DB::table('test_runs')
                ->where('milestone_id', $m->id)
                ->selectRaw('count(*) as total, sum(case when is_completed then 1 else 0 end) as done')
                ->first();

            $total = (int) ($runStats->total ?? 0);
            $done = (int) ($runStats->done ?? 0);

            return [
                'id'        => $m->id,
                'name'      => $m->name,
                'due_on'    => $m->due_on,
                'is_completed' => (bool) $m->is_completed,
                'run_count' => $total,
                'pct_done'  => $total > 0 ? round(($done / $total) * 100, 1) : ((bool) $m->is_completed ? 100.0 : 0.0),
            ];
        })->values()->all();

        // ── Section E: Workload / assignments ───────────────────────────────
        $assignedCounts = DB::table('test_cases')
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->whereIn('suites.project_id', $projectIds)
            ->whereNotNull('test_cases.assigned_to')
            ->selectRaw('test_cases.assigned_to as user_id, count(*) as cnt')
            ->groupBy('test_cases.assigned_to')
            ->pluck('cnt', 'user_id');

        $resultCounts = TestResult::query()
            ->join('test_runs', 'test_results.run_id', '=', 'test_runs.id')
            ->whereIn('test_runs.project_id', $projectIds)
            ->whereNotNull('test_results.created_by')
            ->selectRaw('test_results.created_by as user_id, count(*) as cnt')
            ->groupBy('test_results.created_by')
            ->pluck('cnt', 'user_id');

        $userIds = collect($assignedCounts->keys())
            ->merge($resultCounts->keys())
            ->unique()
            ->values();

        $userNames = DB::table('users')
            ->whereIn('id', $userIds->all())
            ->pluck('name', 'id');

        $workload = $userIds->map(fn ($id): array => [
            'user_id'        => (int) $id,
            'name'           => $userNames[$id] ?? '—',
            'assigned_cases' => (int) ($assignedCounts[$id] ?? 0),
            'results_logged' => (int) ($resultCounts[$id] ?? 0),
        ])
            ->sortByDesc(fn ($w) => $w['assigned_cases'] + $w['results_logged'])
            ->values()
            ->all();

        return [
            'statusTotals'    => $statusTotals,
            'runs'            => $runRows,
            'activity'        => $activity,
            'coverage'        => [
                'total'    => $totalCases,
                'run'      => $casesRun,
                'untested' => $neverRun,
                'pct'      => $totalCases > 0 ? round(($casesRun / $totalCases) * 100, 1) : 0.0,
            ],
            'sectionCoverage' => $sectionCoverage,
            'milestones'      => $milestoneRows,
            'workload'        => $workload,
            'hasMilestones'   => count($milestoneRows) > 0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyDashboard(): array
    {
        return [
            'statusTotals'    => ['passed' => 0, 'failed' => 0, 'blocked' => 0, 'untested' => 0, 'retest' => 0, 'skipped' => 0],
            'runs'            => [],
            'activity'        => [],
            'coverage'        => ['total' => 0, 'run' => 0, 'untested' => 0, 'pct' => 0.0],
            'sectionCoverage' => [],
            'milestones'      => [],
            'workload'        => [],
            'hasMilestones'   => false,
        ];
    }

    /**
     * Build the data payload for reports that have a real summary.
     *
     * @return array<string, mixed>|null
     */
    private function reportData(Project $project, string $type): ?array
    {
        if ($type === 'result_coverage') {
            $runs = $project->testRuns()->get();

            return [
                'passed' => (int) $runs->sum('passed_count'),
                'failed' => (int) $runs->sum('failed_count'),
                'blocked' => (int) $runs->sum('blocked_count'),
                'retest' => (int) $runs->sum('retest_count'),
                'skipped' => (int) $runs->sum('skipped_count'),
                'untested' => (int) $runs->sum('untested_count'),
                'run_count' => $runs->count(),
            ];
        }

        if ($type === 'case_distribution') {
            $byPriority = $project->testCases()
                ->selectRaw('priority, count(*) as cnt')
                ->groupBy('priority')
                ->pluck('cnt', 'priority');

            return [
                'critical' => (int) ($byPriority['critical'] ?? 0),
                'high' => (int) ($byPriority['high'] ?? 0),
                'medium' => (int) ($byPriority['medium'] ?? 0),
                'low' => (int) ($byPriority['low'] ?? 0),
                'total' => (int) $byPriority->sum(),
            ];
        }

        return null;
    }

    /**
     * Ensure the current user may access the given project.
     */
    private function authorizeProjectAccess(Request $request, Project $project): void
    {
        $user = $request->user();

        if ($user->hasRole('admin')) {
            return;
        }

        abort_unless(
            $project->members()->whereKey($user->getKey())->exists(),
            403
        );
    }
}
