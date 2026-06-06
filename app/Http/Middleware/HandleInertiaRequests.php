<?php

namespace App\Http\Middleware;

use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name'         => config('app.name'),
            'auth'         => [
                'user' => $request->user()
                    ? array_merge($request->user()->toArray(), [
                        // Spatie roles as a flat string array — e.g. ['admin'] or ['project_admin']
                        'roles' => $request->user()->getRoleNames()->toArray(),
                    ])
                    : null,
            ],
            'sidebarOpen'  => ! $request->hasCookie('sidebar_state')
                || $request->cookie('sidebar_state') === 'true',
            'locale'       => app()->getLocale(),
            'translations' => $this->loadTranslations(),

            // Current project context — injected when URL matches /projects/{id}/*
            'currentProject' => $this->resolveCurrentProject($request),

            // Project switcher list — only the projects the user can access
            'accessibleProjects' => $this->resolveAccessibleProjects($request),

            // To-do count for the current project (tests assigned to user)
            'todoCount' => $this->resolveTodoCount($request),
        ];
    }

    // ──────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────

    private function resolveCurrentProject(Request $request): ?array
    {
        if (! $request->user()) return null;

        $projectId = $request->route('project')
            ?? (preg_match('#^/projects/(\d+)#', $request->path(), $m) ? $m[1] : null);

        if (! $projectId) return null;

        $project = Project::find($projectId);
        if (! $project) return null;

        // Only expose to users who are members (or admins)
        $user = $request->user();
        if (! $user->hasRole('admin') && ! $project->members()->where('user_id', $user->id)->exists()) {
            return null;
        }

        return [
            'id'         => $project->id,
            'name'       => $project->name,
            'suite_mode' => $project->suite_mode,
        ];
    }

    private function resolveAccessibleProjects(Request $request): array
    {
        if (! $request->user()) return [];

        $user = $request->user();

        $query = Project::select(['id', 'name', 'suite_mode'])
            ->whereNull('completed_at')
            ->orderBy('name');

        if (! $user->hasRole('admin')) {
            $query->whereHas('members', fn ($q) => $q->where('user_id', $user->id));
        }

        return $query->limit(50)->get()->toArray();
    }

    private function resolveTodoCount(Request $request): int
    {
        // Placeholder — wire to actual test assignments when that model exists
        return 0;
    }

    private function loadTranslations(): array
    {
        $locale = app()->getLocale();
        $path   = lang_path($locale);

        if (! is_dir($path)) return [];

        $translations = [];
        foreach (glob("{$path}/*.php") as $file) {
            $key = basename($file, '.php');
            $translations[$key] = require $file;
        }
        return $translations;
    }
}