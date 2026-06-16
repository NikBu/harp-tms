<?php

namespace App\Services\Integrations;

/**
 * GitLab Issues tracker driver — stub (Phase 1 UI only).
 *
 * Required credentials:  token  (GitLab PAT with api scope)
 * Required config:       base_url  (https://gitlab.com or self-hosted)
 *                        project_id (numeric)
 */
class GitLabClient implements TrackerClient
{
    public function __construct(
        private readonly string $baseUrl   = 'https://gitlab.com',
        private readonly string $token     = '',
        private readonly string $projectId = '',
    ) {}

    public function testConnection(): array
    {
        return ['ok' => false, 'message' => 'GitLab integration is not yet implemented.'];
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
