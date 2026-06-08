<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Requirement;
use App\Models\RequirementFolder;
use App\Models\TestCase;
use Illuminate\Http\JsonResponse;
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
            ->with([
                'children.requirements' => fn ($q) => $q->withCount('testCases'),
                'requirements' => fn ($q) => $q->withCount('testCases'),
            ])
            ->orderBy('display_order')
            ->get();

        $requirements = Requirement::query()
            ->where('project_id', $project->id)
            ->whereNull('folder_id')
            ->withCount('testCases')
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
            'testCases:id,title,priority,status',
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
    // Test case linkage
    // -------------------------------------------------------------------------

    /**
     * Link one or more test cases to a requirement.
     * POST /requirements/{requirement}/test-cases
     *
     * Body: { test_case_ids: int[] }
     */
    public function linkTestCases(Request $request, Requirement $requirement): JsonResponse
    {
        $this->authorizeProjectAccess($request, $requirement->project);

        $validated = $request->validate([
            'test_case_ids' => ['required', 'array', 'min:1'],
            'test_case_ids.*' => ['integer', 'exists:test_cases,id'],
        ]);

        // Verify every test case belongs to the same project
        $projectId = $requirement->project_id;
        $valid = TestCase::query()
            ->whereIn('id', $validated['test_case_ids'])
            ->whereHas('suite', fn ($q) => $q->where('project_id', $projectId))
            ->pluck('id');

        $syncData = $valid->mapWithKeys(fn (int $id): array => [
            $id => ['created_by' => Auth::id(), 'created_at' => now()],
        ])->all();

        // syncWithoutDetaching — never removes existing links
        $requirement->testCases()->syncWithoutDetaching($syncData);

        $requirement->load('testCases:id,title,priority,status');

        return response()->json([
            'test_cases' => $requirement->testCases,
        ]);
    }

    /**
     * Unlink a single test case from a requirement.
     * DELETE /requirements/{requirement}/test-cases/{testCase}
     */
    public function unlinkTestCase(Request $request, Requirement $requirement, TestCase $testCase): JsonResponse
    {
        $this->authorizeProjectAccess($request, $requirement->project);

        $requirement->testCases()->detach($testCase->id);

        return response()->json(['ok' => true]);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

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
