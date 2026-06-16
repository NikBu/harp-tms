<?php

namespace App\Services\Integrations;

/**
 * Azure DevOps Boards tracker driver — stub (Phase 1 UI only).
 *
 * Required credentials:  token  (PAT with Work Items read/write)
 * Required config:       organization, project
 */
class AzureDevOpsClient implements TrackerClient
{
    public function __construct(
        private readonly string $token        = '',
        private readonly string $organization = '',
        private readonly string $project      = '',
    ) {}

    public function testConnection(): array
    {
        return ['ok' => false, 'message' => 'Azure DevOps integration is not yet implemented.'];
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
