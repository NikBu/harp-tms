<?php

namespace App\Http\Controllers;

use App\Models\Integration;
use App\Models\Project;
use App\Services\Integrations\TrackerClientFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationController extends Controller
{
    // ── Catalogue ─────────────────────────────────────────────────────────────

    /**
     * All tracker-type integrations the UI can configure.
     * Keys match integration_type values stored in the database.
     *
     * @var list<array{key:string,name:string,tracker:bool}>
     */
    private const TRACKER_TYPES = [
        'jira',
        'github',
        'gitlab',
        'youtrack',
        'azure_devops',
        'bugzilla',
        'linear',
    ];

    /**
     * All integration cards shown in the grid (trackers + future non-tracker).
     *
     * @var list<array{key:string,name:string}>
     */
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

    // ── Index ─────────────────────────────────────────────────────────────────

    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        // Load only tracker-type integrations (one per type per project).
        $saved = $project->integrations()
            ->whereIn('integration_type', self::TRACKER_TYPES)
            ->get(['id', 'integration_type', 'name', 'config', 'is_active'])
            ->keyBy('integration_type');

        return Inertia::render('integrations/index', [
            'project'     => $project->only(['id', 'name']),
            'catalogue'   => self::CATALOGUE,
            'saved'       => $saved->map(fn (Integration $i) => [
                'id'               => $i->id,
                'integration_type' => $i->integration_type,
                'name'             => $i->name,
                'config'           => $i->config ?? [],
                'is_active'        => $i->is_active,
            ])->values(),
            'trackerTypes' => self::TRACKER_TYPES,
        ]);
    }

    // ── Store ─────────────────────────────────────────────────────────────────

    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $data = $request->validate([
            'integration_type' => ['required', 'string', Rule::in(self::TRACKER_TYPES)],
            'name'             => ['nullable', 'string', 'max:120'],
            'config'           => ['nullable', 'array'],
            'credentials'      => ['nullable', 'array'],
            'is_active'        => ['boolean'],
        ]);

        // Upsert: one row per type per project.
        $integration = $project->integrations()
            ->firstOrNew(['integration_type' => $data['integration_type']]);

        $integration->fill([
            'name'        => $data['name'] ?? $data['integration_type'],
            'config'      => $data['config']      ?? [],
            'credentials' => $data['credentials'] ?? [],
            'is_active'   => $data['is_active']   ?? false,
            'created_by'  => $request->user()->getKey(),
        ]);

        $integration->save();

        return back()->with('success', __('integrations.saved'));
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public function update(Request $request, Project $project, Integration $integration): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);
        abort_unless($integration->project_id === $project->id, 404);

        $data = $request->validate([
            'name'        => ['nullable', 'string', 'max:120'],
            'config'      => ['nullable', 'array'],
            'credentials' => ['nullable', 'array'],
            'is_active'   => ['boolean'],
        ]);

        $integration->fill([
            'name'        => $data['name']        ?? $integration->name,
            'config'      => $data['config']      ?? $integration->config,
            'credentials' => $data['credentials'] ?? [],   // always re-encrypt on save
            'is_active'   => $data['is_active']   ?? $integration->is_active,
        ]);

        $integration->save();

        return back()->with('success', __('integrations.saved'));
    }

    // ── Destroy ───────────────────────────────────────────────────────────────

    public function destroy(Request $request, Project $project, Integration $integration): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);
        abort_unless($integration->project_id === $project->id, 404);

        $integration->delete();

        return back()->with('success', __('integrations.deleted'));
    }

    // ── Test connection ───────────────────────────────────────────────────────

    public function testConnection(Request $request, Project $project, Integration $integration): JsonResponse
    {
        $this->authorizeProjectAccess($request, $project);
        abort_unless($integration->project_id === $project->id, 404);

        try {
            $client = TrackerClientFactory::make($integration);
            $result = $client->testConnection();
        } catch (\InvalidArgumentException $e) {
            $result = ['ok' => false, 'message' => $e->getMessage()];
        }

        return response()->json($result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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
