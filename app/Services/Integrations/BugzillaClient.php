<?php

namespace App\Services\Integrations;

/**
 * Bugzilla tracker driver — stub (Phase 1 UI only).
 *
 * Required credentials:  api_key
 * Required config:       base_url, product
 */
class BugzillaClient implements TrackerClient
{
    public function __construct(
        private readonly string $baseUrl = '',
        private readonly string $apiKey  = '',
        private readonly string $product = '',
    ) {}

    public function testConnection(): array
    {
        return ['ok' => false, 'message' => 'Bugzilla integration is not yet implemented.'];
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
