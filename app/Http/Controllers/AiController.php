<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiController extends Controller
{
    /**
     * Display the AI features stub page for the project.
     */
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        return Inertia::render('ai/index', [
            'project' => $project->only(['id', 'name']),
        ]);
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
