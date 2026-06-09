<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
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
