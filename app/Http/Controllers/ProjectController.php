<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Display a paginated listing of the projects accessible to the current user.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Project::query()
            ->with(['createdBy:id,name', 'members:id,name,email'])
            ->withCount('members')
            ->latest();

        if (! $user->hasRole('admin')) {
            $query->whereHas('members', function ($q) use ($user): void {
                $q->whereKey($user->getKey());
            });
        }

        return Inertia::render('projects/index', [
            'projects' => $query->paginate(20),
        ]);
    }

    /**
     * Show the form for creating a new project.
     */
    public function create(): Response
    {
        return Inertia::render('projects/create');
    }

    /**
     * Store a newly created project in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'suite_mode' => ['required', 'integer', 'in:1,2,3'],
        ]);

        $validated['created_by'] = Auth::id();

        $project = Project::create($validated);

        $project->members()->attach(Auth::id(), ['role' => 'project_admin']);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('projects.created')]);

        return to_route('projects.show', $project);
    }

    /**
     * Display the specified project dashboard.
     */
    public function show(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $user = $request->user();

        $project->load([
            'createdBy:id,name',
            'members:id,name,email',
            'milestones' => fn ($q) => $q->whereNull('parent_id')->orderBy('due_on'),
        ]);

        $project->loadCount([
            'requirements',
            'suites',
            'testCases',
            'testRuns',
        ]);

        $canManage = $user->hasRole('admin') || $project->members()
            ->whereKey($user->getKey())
            ->wherePivot('role', 'project_admin')
            ->exists();

        $recentRuns = $project->testRuns()
            ->where('is_completed', false)
            ->with('milestone:id,name')
            ->withCount(['tests'])
            ->orderByDesc('created_at')
            ->limit(3)
            ->get();

        // Cases link: single-suite projects with exactly one suite jump straight to it.
        $casesHref = "/projects/{$project->id}/suites";

        if ($project->suite_mode === Project::SUITE_SINGLE && $project->suites_count === 1) {
            $singleSuite = $project->suites()->oldest('id')->first();

            if ($singleSuite !== null) {
                $casesHref = "/suites/{$singleSuite->id}";
            }
        }

        // Cases grouped by priority (priority stored as string: critical/high/medium/low).
        $priorityCounts = $project->testCases()
            ->selectRaw('priority, count(*) as cnt')
            ->groupBy('priority')
            ->pluck('cnt', 'priority');

        $casesByPriority = [
            'critical' => (int) ($priorityCounts['critical'] ?? 0),
            'high' => (int) ($priorityCounts['high'] ?? 0),
            'medium' => (int) ($priorityCounts['medium'] ?? 0),
            'low' => (int) ($priorityCounts['low'] ?? 0),
        ];

        // Pass/fail breakdown for the most recently created run.
        $latestRun = $project->testRuns()->orderByDesc('created_at')->first();

        $latestRunStats = $latestRun === null ? null : [
            'name' => $latestRun->name,
            'passed' => (int) $latestRun->passed_count,
            'failed' => (int) $latestRun->failed_count,
            'blocked' => (int) $latestRun->blocked_count,
            'retest' => (int) $latestRun->retest_count,
            'skipped' => (int) $latestRun->skipped_count,
            'untested' => (int) $latestRun->untested_count,
        ];

        // Per-milestone progress based on associated runs.
        $milestoneStats = $project->milestones->map(function ($milestone): array {
            $total = $milestone->testRuns()->count();
            $closed = $milestone->testRuns()->where('is_completed', true)->count();

            return [
                'id' => $milestone->id,
                'name' => $milestone->name,
                'is_completed' => (bool) $milestone->is_completed,
                'due_on' => $milestone->due_on,
                'run_count' => $total,
                'progress' => $total > 0 ? (int) round(($closed / $total) * 100) : 0,
            ];
        })->values();

        return Inertia::render('projects/show', [
            'project' => array_merge($project->toArray(), [
                'cases_href' => $casesHref,
            ]),
            'canManage' => $canManage,
            'recentRuns' => $recentRuns,
            'casesByPriority' => $casesByPriority,
            'latestRunStats' => $latestRunStats,
            'milestoneStats' => $milestoneStats,
        ]);
    }

    /**
     * Update the specified project in storage.
     */
    public function update(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'announcement' => ['nullable', 'string'],
            'show_announcement' => ['boolean'],
            'is_completed' => ['boolean'],
        ]);

        $validated['completed_at'] = ($validated['is_completed'] ?? false) ? now() : null;

        $project->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('projects.updated')]);

        return back();
    }

    /**
     * Remove the specified project from storage.
     */
    public function destroy(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();

        $isProjectAdmin = $project->members()
            ->whereKey($user->getKey())
            ->wherePivot('role', 'project_admin')
            ->exists();

        abort_unless($isProjectAdmin || $user->hasRole('admin'), 403);

        $project->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('projects.deleted')]);

        return to_route('projects.index');
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
