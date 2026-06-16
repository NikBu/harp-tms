<?php

namespace App\Services\Integrations;

/**
 * Linear tracker driver — stub (Phase 1 UI only).
 *
 * Required credentials:  api_key  (Linear Personal API key)
 * Required config:       team_id
 */
class LinearClient implements TrackerClient
{
    public function __construct(
        private readonly string $apiKey = '',
        private readonly string $teamId = '',
    ) {}

    public function testConnection(): array
    {
        return ['ok' => false, 'message' => 'Linear integration is not yet implemented.'];
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
