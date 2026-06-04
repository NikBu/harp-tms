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

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.projects.created')]);

        return to_route('projects.show', $project);
    }

    /**
     * Display the specified project dashboard.
     */
    public function show(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $project->load([
            'createdBy:id,name',
            'members:id,name,email',
            'milestones' => function ($query): void {
                $query->whereNull('parent_id')->orderBy('due_on');
            },
        ]);
        $project->loadCount(['requirements', 'suites', 'testCases']);

        return Inertia::render('projects/show', [
            'project' => $project,
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

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.projects.updated')]);

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

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.projects.deleted')]);

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
