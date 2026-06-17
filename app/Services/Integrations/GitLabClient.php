<?php

namespace App\Services\Integrations;

class GitLabClient implements TrackerClient
{
    public function __construct(array $credentials, array $config) {}

    public function testConnection(): array
    {
        return ['ok' => false, 'message' => 'GitLab integration coming soon.'];
    }

    public function findIssue(string $issueId): ?array
    {
        return null;
    }

    public function createIssue(array $data): array
    {
        throw new \RuntimeException('GitLab integration coming soon.');
    }

    public function getProjectsList(): array
    {
        return [];
    }
}
