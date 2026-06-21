<?php

namespace App\Http\Controllers;

use App\Models\Integration;
use App\Models\Project;
use App\Services\Integrations\TrackerClientFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationController extends Controller
{
    private const TRACKER_TYPES = [
        'jira',
        'github',
        'gitlab',
        'youtrack',
        'azure_devops',
        'bugzilla',
        'linear',
    ];

    private const CATALOGUE = [
        ['key' => 'jira',         'name' => 'Jira'],
        ['key' => 'github',       'name' => 'GitHub'],
        ['key' => 'gitlab',       'name' => 'GitLab'],
        ['key' => 'youtrack',     'name' => 'YouTrack'],
        ['key' => 'azure_devops', 'name' => 'Azure DevOps'],
        ['key' => 'bugzilla',     'name' => 'Bugzilla'],
        ['key' => 'linear',       'name' => 'Linear'],
        ['key' => 'slack',        'name' => 'Slack'],
        ['key' => 'pagerduty',    'name' => 'PagerDuty'],
        ['key' => 'zapier',       'name' => 'Zapier'],
        ['key' => 'jenkins',      'name' => 'Jenkins'],
    ];

    public function index(Request $request, Project $project): Response
    {
        Gate::authorize('view', $project);

        $saved = $project->integrations()
            ->whereIn('integration_type', self::TRACKER_TYPES)
            ->get(['id', 'integration_type', 'name', 'config', 'is_active'])
            ->keyBy('integration_type');

        return Inertia::render('integrations/index', [
            'project' => $project->only(['id', 'name']),
            'catalogue' => self::CATALOGUE,
            'saved' => $saved->map(fn (Integration $i) => [
                'id' => $i->id,
                'integration_type' => $i->integration_type,
                'name' => $i->name,
                'config' => $i->config ?? [],
                'is_active' => $i->is_active,
            ])->values(),
            'trackerTypes' => self::TRACKER_TYPES,
        ]);
    }

    public function store(Request $request, Project $project): RedirectResponse
    {
        Gate::authorize('edit', $project);

        $data = $request->validate([
            'integration_type' => ['required', 'string', Rule::in(self::TRACKER_TYPES)],
            'name' => ['nullable', 'string', 'max:120'],
            'config' => ['nullable', 'array'],
            'credentials' => ['nullable', 'array'],
            'is_active' => ['boolean'],
        ]);

        $integration = $project->integrations()
            ->firstOrNew(['integration_type' => $data['integration_type']]);

        $integration->fill([
            'name' => $data['name'] ?? $data['integration_type'],
            'config' => $data['config'] ?? [],
            'credentials' => $data['credentials'] ?? [],
            'is_active' => $data['is_active'] ?? false,
            'created_by' => $request->user()->getKey(),
        ]);

        $integration->save();

        return back()->with('success', __('integrations.saved'));
    }

    public function update(Request $request, Project $project, Integration $integration): RedirectResponse
    {
        Gate::authorize('edit', $project);
        abort_unless($integration->project_id === $project->id, 404);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'config' => ['nullable', 'array'],
            'credentials' => ['nullable', 'array'],
            'is_active' => ['boolean'],
        ]);

        $integration->fill([
            'name' => $data['name'] ?? $integration->name,
            'config' => $data['config'] ?? $integration->config,
            'credentials' => $data['credentials'] ?? [],
            'is_active' => $data['is_active'] ?? $integration->is_active,
        ]);

        $integration->save();

        return back()->with('success', __('integrations.saved'));
    }

    public function destroy(Request $request, Project $project, Integration $integration): RedirectResponse
    {
        Gate::authorize('edit', $project);
        abort_unless($integration->project_id === $project->id, 404);

        $integration->delete();

        return back()->with('success', __('integrations.deleted'));
    }

    public function testConnection(Request $request, Project $project, Integration $integration): JsonResponse
    {
        Gate::authorize('view', $project);
        abort_unless($integration->project_id === $project->id, 404);

        try {
            $client = app(TrackerClientFactory::class)->make($integration);
            $result = $client->testConnection();
        } catch (\InvalidArgumentException $e) {
            $result = ['ok' => false, 'message' => $e->getMessage()];
        }

        return response()->json($result);
    }
}
