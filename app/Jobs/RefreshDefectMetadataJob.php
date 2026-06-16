<?php

namespace App\Jobs;

use App\Models\DefectLink;
use App\Models\Integration;
use App\Services\Integrations\TrackerClientFactory;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Throwable;

class RefreshDefectMetadataJob implements ShouldQueue
{
    use Queueable, InteractsWithQueue;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public readonly DefectLink $defect) {}

    public function handle(TrackerClientFactory $factory): void
    {
        $integration = Integration::where('project_id', $this->defect->testResult->run->project_id)
            ->where('provider', $this->defect->tracker_type)
            ->where('is_active', true)
            ->first();

        if ($integration === null) {
            return;
        }

        $client = $factory->make($integration);
        $issue  = $client->findIssue($this->defect->external_id);

        if ($issue === null) {
            return;
        }

        $this->defect->update([
            'title'              => $issue['title'],
            'status'             => $issue['status'],
            'cached_metadata'    => $issue,
            'cache_refreshed_at' => now(),
        ]);
    }

    public function failed(Throwable $e): void
    {
        // Silently fail — stale badge is better than a broken page
    }
}
