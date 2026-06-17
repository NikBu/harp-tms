<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\Reports\ActivitySummarySegment;
use App\Services\Reports\CaseDistributionSegment;
use App\Services\Reports\CrossProjectSegment;
use App\Services\Reports\DashboardSegment;
use App\Services\Reports\MilestoneProgressSegment;
use App\Services\Reports\ResultCoverageSegment;
use App\Services\Reports\WorkloadSegment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * Available report types (key, i18n-ready).
     *
     * @var list<array{key: string}>
     */
    private const REPORT_TYPES = [
        ['key' => 'activity_summary'],
        ['key' => 'result_coverage'],
        ['key' => 'milestone_progress'],
        ['key' => 'case_distribution'],
        ['key' => 'workload'],
    ];

    public function __construct(
        private readonly DashboardSegment         $dashboard,
        private readonly ActivitySummarySegment   $activity,
        private readonly ResultCoverageSegment    $coverage,
        private readonly CaseDistributionSegment  $distribution,
        private readonly MilestoneProgressSegment $milestones,
        private readonly WorkloadSegment          $workload,
        private readonly CrossProjectSegment      $crossProject,
    ) {}

    /**
     * Per-project report landing page.
     */
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $user = $request->user();

        // Provide the full accessible projects list so the cross-project tab
        // works correctly even when viewing a specific project's reports page.
        $projects = $user->hasRole('admin')
            ? Project::orderBy('name')->get(['id', 'name'])
            : $user->projects()->orderBy('name')->get(['projects.id', 'projects.name']);

        return Inertia::render('reports/index', [
            'project'     => $project->only(['id', 'name']),
            'projects'    => $projects,
            'reportTypes' => self::REPORT_TYPES,
            'isGlobal'    => false,
            'dashboard'   => $this->dashboard->compute(collect([$project])),
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
            'project'     => null,
            'projects'    => $projects,
            'reportTypes' => self::REPORT_TYPES,
            'isGlobal'    => true,
            'dashboard'   => $this->dashboard->compute($projects),
        ]);
    }

    /**
     * Show a single report for a specific project.
     */
    public function show(Request $request, Project $project, string $type): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $reportKey = collect(self::REPORT_TYPES)->firstWhere('key', $type);
        abort_if($reportKey === null, 404);

        return Inertia::render('reports/show', [
            'project' => $project->only(['id', 'name']),
            'type'    => $type,
            'data'    => $this->computeReport([$project->id], $type),
        ]);
    }

    /**
     * Aggregate one report type across several projects.
     */
    public function cross(Request $request): Response
    {
        $user = $request->user();

        $validated = $request->validate([
            'project_ids'   => ['required', 'array', 'min:1'],
            'project_ids.*' => ['integer', 'exists:projects,id'],
            'type'          => ['required', 'string'],
        ]);

        abort_if(collect(self::REPORT_TYPES)->firstWhere('key', $validated['type']) === null, 404);

        $projects = Project::whereIn('id', $validated['project_ids'])->get();

        $accessible = $projects->filter(function (Project $project) use ($user): bool {
            return $user->hasRole('admin')
                || $project->members()->whereKey($user->getKey())->exists();
        });

        $results = $this->crossProject->compute($accessible, $validated['type']);

        return Inertia::render('reports/cross-project', [
            'results'  => $results,
            'type'     => $validated['type'],
            'projects' => $accessible->map->only(['id', 'name'])->values(),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * @param  list<int>  $projectIds
     * @return array<string, mixed>|null
     */
    private function computeReport(array $projectIds, string $type): ?array
    {
        return match ($type) {
            'activity_summary'   => $this->activity->compute($projectIds),
            'result_coverage'    => $this->coverage->compute($projectIds),
            'case_distribution'  => $this->distribution->compute($projectIds),
            'milestone_progress' => $this->milestones->compute($projectIds),
            'workload'           => $this->workload->compute($projectIds),
            default              => null,
        };
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
