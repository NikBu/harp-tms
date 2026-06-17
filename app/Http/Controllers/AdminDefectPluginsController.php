<?php

namespace App\Http\Controllers;

use App\Models\Integration;
use App\Services\Integrations\TrackerClientFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminDefectPluginsController extends Controller
{
    /**
     * Plugins available at instance level.
     * 'live' = true means the connector is implemented (Jira, GitHub for MVP).
     * Others are rendered as "Coming Soon" stubs.
     */
    private const PLUGINS = [
        ['key' => 'jira',         'name' => 'Jira',        'live' => true],
        ['key' => 'github',       'name' => 'GitHub',      'live' => true],
        ['key' => 'gitlab',       'name' => 'GitLab',      'live' => false],
        ['key' => 'youtrack',     'name' => 'YouTrack',    'live' => false],
        ['key' => 'azure_devops', 'name' => 'Azure DevOps','live' => false],
        ['key' => 'bugzilla',     'name' => 'Bugzilla',    'live' => false],
        ['key' => 'linear',       'name' => 'Linear',      'live' => false],
    ];

    private const LIVE_KEYS = ['jira', 'github'];

    // ── Index ────────────────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $this->authorizeAdmin($request);

        // Instance-level plugin configs have no project_id.
        $saved = Integration::query()
            ->whereNull('project_id')
            ->whereIn('integration_type', self::LIVE_KEYS)
            ->get(['id', 'integration_type', 'name', 'config', 'is_active'])
            ->map(fn (Integration $i) => [
                'id'               => $i->id,
                'integration_type' => $i->integration_type,
                'name'             => $i->name,
                'config'           => $i->config ?? [],
                'is_active'        => $i->is_active,
            ])
            ->values();

        return Inertia::render('admin/integration/defect-plugins', [
            'plugins' => self::PLUGINS,
            'saved'   => $saved,
        ]);
    }

    // ── Store ───────────────────────────────────────────────────────────────────────

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'integration_type' => ['required', 'string', Rule::in(self::LIVE_KEYS)],
            'name'             => ['nullable', 'string', 'max:120'],
            'config'           => ['nullable', 'array'],
            'credentials'      => ['nullable', 'array'],
            'is_active'        => ['boolean'],
        ]);

        // One instance-level row per integration type.
        $integration = Integration::query()
            ->whereNull('project_id')
            ->firstOrNew(['integration_type' => $data['integration_type']]);

        $integration->fill([
            'project_id'  => null,
            'name'        => $data['name'] ?? $data['integration_type'],
            'config'      => $data['config']      ?? [],
            'credentials' => $data['credentials'] ?? [],
            'is_active'   => $data['is_active']   ?? false,
            'created_by'  => $request->user()->getKey(),
        ])->save();

        return back()->with('success', __('app.integrations.saved'));
    }

    // ── Update ─────────────────────────────────────────────────────────────────────

    public function update(Request $request, Integration $integration): RedirectResponse
    {
        $this->authorizeAdmin($request);
        abort_unless(is_null($integration->project_id), 404);

        $data = $request->validate([
            'name'        => ['nullable', 'string', 'max:120'],
            'config'      => ['nullable', 'array'],
            'credentials' => ['nullable', 'array'],
            'is_active'   => ['boolean'],
        ]);

        $integration->fill([
            'name'        => $data['name']        ?? $integration->name,
            'config'      => $data['config']      ?? $integration->config,
            'credentials' => $data['credentials'] ?? [],
            'is_active'   => $data['is_active']   ?? $integration->is_active,
        ])->save();

        return back()->with('success', __('app.integrations.saved'));
    }

    // ── Destroy ────────────────────────────────────────────────────────────────────

    public function destroy(Request $request, Integration $integration): RedirectResponse
    {
        $this->authorizeAdmin($request);
        abort_unless(is_null($integration->project_id), 404);

        $integration->delete();

        return back()->with('success', __('app.integrations.deleted'));
    }

    // ── Test connection ─────────────────────────────────────────────────────────

    public function testConnection(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_unless(is_null($integration->project_id), 404);

        try {
            $result = TrackerClientFactory::make($integration)->testConnection();
        } catch (\InvalidArgumentException $e) {
            $result = ['ok' => false, 'message' => $e->getMessage()];
        }

        return response()->json($result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────────

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->hasRole('admin'), 403);
    }
}
