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
    public function index(Project $project): Response
    {
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

    public function show(Requirement $requirement): Response
    {
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

    public function create(Project $project): Response
    {
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
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'string', 'in:'.implode(',', Requirement::TYPES)],
            'priority' => ['nullable', 'string', 'in:'.implode(',', Requirement::PRIORITIES)],
            'status' => ['nullable', 'string', 'in:'.implode(',', Requirement::STATUSES)],
            'folder_id' => ['nullable', 'integer', 'exists:requirement_folders,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'external_ref' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'string'],   // ← string, not array
        ]);

        // Split comma-separated tag string into a clean array before persisting
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

        return redirect()->route('requirements.index', $project)
            ->with('success', 'Requirement created.');
    }

    public function update(Request $request, Requirement $requirement): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['nullable', 'string', 'in:'.implode(',', Requirement::TYPES)],
            'priority' => ['nullable', 'string', 'in:'.implode(',', Requirement::PRIORITIES)],
            'status' => ['nullable', 'string', 'in:'.implode(',', Requirement::STATUSES)],
            'folder_id' => ['nullable', 'integer', 'exists:requirement_folders,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'external_ref' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'string'],   // ← string, not array
        ]);

        $validated['tags'] = $this->parseTags($validated['tags'] ?? null);

        $requirement->update(array_merge($validated, [
            'updated_by' => Auth::id(),
        ]));

        return redirect()->route('requirements.show', $requirement)
            ->with('success', 'Requirement updated.');
    }

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

    public function edit(Requirement $requirement): Response
    {
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

    /*     public function update(Request $request, Requirement $requirement): RedirectResponse
        {
            $validated = $request->validate([
                'title'        => ['required', 'string', 'max:255'],
                'description'  => ['nullable', 'string'],
                'type'         => ['nullable', 'string', 'in:' . implode(',', Requirement::TYPES)],
                'priority'     => ['nullable', 'string', 'in:' . implode(',', Requirement::PRIORITIES)],
                'status'       => ['nullable', 'string', 'in:' . implode(',', Requirement::STATUSES)],
                'folder_id'    => ['nullable', 'integer', 'exists:requirement_folders,id'],
                'assigned_to'  => ['nullable', 'integer', 'exists:users,id'],
                'external_ref' => ['nullable', 'string', 'max:255'],
                'tags'         => ['nullable', 'array'],
                'tags.*'       => ['string', 'max:50'],
            ]);

            $requirement->update(array_merge($validated, [
                'updated_by' => Auth::id(),
            ]));

            return redirect()->route('requirements.show', $requirement)
                ->with('success', 'Requirement updated.');
        } */

    public function destroy(Requirement $requirement): RedirectResponse
    {
        $projectId = $requirement->project_id;
        $requirement->delete();

        return redirect()->route('requirements.index', $projectId)
            ->with('success', 'Requirement deleted.');
    }
}
