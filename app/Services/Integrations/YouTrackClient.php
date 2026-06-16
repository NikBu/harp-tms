<?php

namespace App\Services\Integrations;

/**
 * YouTrack tracker driver — stub (Phase 1 UI only).
 *
 * Required credentials:  token  (permanent YouTrack token)
 * Required config:       base_url  (https://yourcompany.myjetbrains.com/youtrack)
 *                        project_id
 */
class YouTrackClient implements TrackerClient
{
    public function __construct(
        private readonly string $baseUrl   = '',
        private readonly string $token     = '',
        private readonly string $projectId = '',
    ) {}

    public function testConnection(): array
    {
        return ['ok' => false, 'message' => 'YouTrack integration is not yet implemented.'];
    }

    public function findIssue(string $issueId): ?array
    {
        return null;
    }

    public function getProjectsList(): array
    {
        return [];
    }
}
