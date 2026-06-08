<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Section;
use App\Models\Suite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class SectionController extends Controller
{
    /**
     * Store a newly created section within the given suite.
     */
    public function store(Request $request, Suite $suite): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $suite->project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:sections,id'],
            'description' => ['nullable', 'string'],
        ]);

        $siblingCount = $suite->sections()
            ->where('parent_id', $validated['parent_id'] ?? null)
            ->count();

        $validated['display_order'] = $siblingCount + 1;

        $suite->sections()->create($validated);

        return back();
    }

    /**
     * Update the specified section.
     */
    public function update(Request $request, Section $section): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $section->suite->project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $section->update($validated);

        return back();
    }

    /**
     * Remove the specified section.
     */
    public function destroy(Request $request, Section $section): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $section->suite->project);

        $section->delete();

        return back();
    }

    /**
     * Persist a new ordering for the given suite's sections.
     */
    public function reorder(Request $request, Project $project, Suite $suite): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', 'exists:sections,id'],
            'items.*.position' => ['required', 'integer'],
        ]);

        DB::transaction(function () use ($suite, $validated): void {
            foreach ($validated['items'] as $item) {
                $suite->sections()
                    ->whereKey($item['id'])
                    ->update(['display_order' => $item['position']]);
            }
        });

        return response()->noContent();
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
