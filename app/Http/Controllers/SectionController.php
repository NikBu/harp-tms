<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Section;
use App\Models\Suite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class SectionController extends Controller
{
    public function store(Request $request, Project $project, Suite $suite): RedirectResponse
    {
        Gate::authorize('edit', $suite->project);

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'parent_id'   => ['nullable', 'integer', 'exists:sections,id'],
            'description' => ['nullable', 'string'],
        ]);

        $siblingCount = $suite->sections()
            ->where('parent_id', $validated['parent_id'] ?? null)
            ->count();

        $validated['display_order'] = $siblingCount + 1;

        $suite->sections()->create($validated);

        return back();
    }

    public function update(Request $request, Section $section): RedirectResponse
    {
        Gate::authorize('edit', $section->suite->project);

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $section->update($validated);

        return back();
    }

    public function destroy(Request $request, Section $section): RedirectResponse
    {
        Gate::authorize('delete', $section->suite->project);

        $section->delete();

        return back();
    }

    public function reorder(Request $request, Project $project, Suite $suite): Response
    {
        Gate::authorize('edit', $project);

        $validated = $request->validate([
            'items'            => ['required', 'array'],
            'items.*.id'       => ['required', 'integer', 'exists:sections,id'],
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
}
