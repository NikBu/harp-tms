<?php

namespace App\Http\Controllers;

use App\Jobs\RefreshDefectMetadataJob;
use App\Models\DefectLink;
use App\Models\Integration;
use App\Models\TestResult;
use App\Services\Integrations\TrackerClientFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class DefectLinkController extends Controller
{
    public function __construct(private TrackerClientFactory $factory) {}

    /**
     * Link an existing external issue to a test result.
     * POST /results/{result}/defects
     */
    public function store(Request $request, TestResult $result): JsonResponse
    {
        $this->authorizeResult($result);

        $data = $request->validate([
            'integration_id' => ['required', 'integer', 'exists:integrations,id'],
            'external_id'    => ['required', 'string', 'max:255'],
        ]);

        $integration = Integration::findOrFail($data['integration_id']);
        $client      = $this->factory->make($integration);
        $issue       = $client->findIssue($data['external_id']);

        if ($issue === null) {
            return response()->json(['message' => __('defects.issue_not_found')], 422);
        }

        $link = $result->defectLinks()->create([
            'tracker_type'     => $integration->provider,
            'external_id'      => $issue['id'],
            'external_url'     => $issue['url'],
            'title'            => $issue['title'],
            'status'           => $issue['status'],
            'cached_metadata'  => $issue,
            'cache_refreshed_at' => now(),
            'created_by'       => $request->user()->id,
        ]);

        return response()->json($link, 201);
    }

    /**
     * Create a new issue in the tracker and immediately link it.
     * POST /results/{result}/defects/create-in-tracker
     */
    public function createInTracker(Request $request, TestResult $result): JsonResponse
    {
        $this->authorizeResult($result);

        $data = $request->validate([
            'integration_id' => ['required', 'integer', 'exists:integrations,id'],
            'title'          => ['required', 'string', 'max:500'],
            'description'    => ['nullable', 'string'],
            'priority'       => ['nullable', 'string', 'max:64'],
        ]);

        $integration = Integration::findOrFail($data['integration_id']);
        $client      = $this->factory->make($integration);

        $issue = $client->createIssue([
            'title'       => $data['title'],
            'description' => $data['description'] ?? '',
            'priority'    => $data['priority'] ?? null,
        ]);

        $link = $result->defectLinks()->create([
            'tracker_type'       => $integration->provider,
            'external_id'        => $issue['id'],
            'external_url'       => $issue['url'],
            'title'              => $issue['title'],
            'status'             => $issue['status'],
            'cached_metadata'    => $issue,
            'cache_refreshed_at' => now(),
            'created_by'         => $request->user()->id,
        ]);

        return response()->json($link, 201);
    }

    /**
     * Unlink a defect from a test result.
     * DELETE /results/{result}/defects/{defect}
     */
    public function destroy(TestResult $result, DefectLink $defect): JsonResponse
    {
        $this->authorizeResult($result);
        abort_unless($defect->test_result_id === $result->id, 404);

        $defect->delete();

        return response()->json(['message' => __('defects.unlinked')]);
    }

    /**
     * Re-sync cached metadata from the tracker.
     * POST /results/{result}/defects/{defect}/refresh
     */
    public function refresh(TestResult $result, DefectLink $defect): JsonResponse
    {
        $this->authorizeResult($result);
        abort_unless($defect->test_result_id === $result->id, 404);

        RefreshDefectMetadataJob::dispatchSync($defect);
        $defect->refresh();

        return response()->json($defect);
    }

    /**
     * Live lookup — fetch issue metadata without persisting.
     * GET /api/integrations/{integration}/issues/{issueId}
     */
    public function lookup(Request $request, Integration $integration, string $issueId): JsonResponse
    {
        Gate::authorize('view', $integration->project);

        $client = $this->factory->make($integration);
        $issue  = $client->findIssue($issueId);

        if ($issue === null) {
            return response()->json(['message' => __('defects.issue_not_found')], 404);
        }

        return response()->json($issue);
    }

    private function authorizeResult(TestResult $result): void
    {
        $run = $result->run;
        abort_if($run->is_closed, 403, __('runs.closed_error'));
        Gate::authorize('view', $run->project);
    }
}
