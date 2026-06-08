<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Requirement;
use App\Models\RequirementFolder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class RequirementController extends Controller
{
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $folders = RequirementFolder::query()
            ->where('project_id', $project->id)
            ->whereNull('parent_id')
            ->with(['children.requirements', 'requirements'])
            ->orderBy('display_order')
            ->get();

        $requirements = Requirement::query()
            ->where('project_id', $project->id)
            ->whereNull('folder_id')
            ->with(['assignedTo:id,name', 'createdBy:id,name'])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('requirements/index', [
            'project' => $project,
            'folders' => $folders,
            'requirements' => $requirements,
            'types' => Requirement::TYPES,
            'priorities' => Requirement::PRIORITIES,
            'statuses' => Requirement::STATUSES,
        ]);
    }

    public function show(Request $request, Requirement $requirement): Response
    {
        $this->authorizeProjectAccess($request, $requirement->project);

        $requirement->load([
            'project:id,name',
            'folder:id,name',
            'assignedTo:id,name',
            'createdBy:id,name',
            'updatedBy:id,name',
            'testCases:id,title',
        ]);

        return Inertia::render('requirements/show', [
            'requirement' => $requirement,
        ]);
    }

    public function create(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $folders = RequirementFolder::query()
            ->where('project_id', $project->id)
            ->orderBy('name')
            ->get(['id', 'name', 'parent_id']);

        $members = $project->members()->get(['users.id', 'users.name']);

        return Inertia::render('requirements/create', [
            'project' => $project,
            'folders' => $folders,
            'members' => $members,
            'types' => Requirement::TYPES,
            'priorities' => Requirement::PRIORITIES,
            'statuses' => Requirement::STATUSES,
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'string', 'in:'.implode(',', Requirement::TYPES)],
            'priority' => ['nullable', 'string', 'in:'.implode(',', Requirement::PRIORITIES)],
            'status' => ['nullable', 'string', 'in:'.implode(',', Requirement::STATUSES)],
            'folder_id' => ['nullable', 'integer', 'exists:requirement_folders,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'external_ref' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'string'],
        ]);

        $validated['tags'] = $this->parseTags($validated['tags'] ?? null);

        $count = Requirement::where('project_id', $project->id)->count();
        $displayId = 'REQ-'.$project->id.'-'.str_pad($count + 1, 4, '0', STR_PAD_LEFT);

        Requirement::create(array_merge($validated, [
            'project_id' => $project->id,
            'display_id' => $displayId,
            'source' => 'manual',
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]));

        return to_route('projects.requirements.index', $project)
            ->with('success', __('app.requirements.created'));
    }

    public function edit(Request $request, Requirement $requirement): Response
    {
        $this->authorizeProjectAccess($request, $requirement->project);

        $requirement->load('project:id,name');

        $folders = RequirementFolder::query()
            ->where('project_id', $requirement->project_id)
            ->orderBy('name')
            ->get(['id', 'name', 'parent_id']);

        $members = $requirement->project->members()->get(['users.id', 'users.name']);

        return Inertia::render('requirements/edit', [
            'requirement' => $requirement,
            'folders' => $folders,
            'members' => $members,
            'types' => Requirement::TYPES,
            'priorities' => Requirement::PRIORITIES,
            'statuses' => Requirement::STATUSES,
        ]);
    }

    public function update(Request $request, Requirement $requirement): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $requirement->project);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'string', 'in:'.implode(',', Requirement::TYPES)],
            'priority' => ['nullable', 'string', 'in:'.implode(',', Requirement::PRIORITIES)],
            'status' => ['nullable', 'string', 'in:'.implode(',', Requirement::STATUSES)],
            'folder_id' => ['nullable', 'integer', 'exists:requirement_folders,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'external_ref' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'string'],
        ]);

        $validated['tags'] = $this->parseTags($validated['tags'] ?? null);

        $requirement->update(array_merge($validated, [
            'updated_by' => Auth::id(),
        ]));

        return to_route('requirements.show', $requirement)
            ->with('success', __('app.requirements.updated'));
    }

    public function destroy(Request $request, Requirement $requirement): RedirectResponse
    {
        $project = $requirement->project;
        $user = $request->user();

        $isProjectAdmin = $project->members()
            ->whereKey($user->getKey())
            ->wherePivot('role', 'project_admin')
            ->exists();

        abort_unless($isProjectAdmin || $user->hasRole('admin'), 403);

        $requirement->delete();

        return to_route('projects.requirements.index', $project)
            ->with('success', __('app.requirements.deleted'));
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Convert a comma-separated tag string into a trimmed, de-duped array.
     * Returns null when the input is blank so the DB column stays null.
     */
    private function parseTags(?string $raw): ?array
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }

        $tags = array_values(
            array_unique(
                array_filter(
                    array_map('trim', explode(',', $raw))
                )
            )
        );

        return $tags ?: null;
    }

    /**
     * Ensure the current user may access the given project.
     * Mirrors the same helper in TestRunController.
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
