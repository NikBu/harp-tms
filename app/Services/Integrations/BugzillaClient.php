<?php

namespace App\Services\Integrations;

class BugzillaClient implements TrackerClient
{
    public function __construct(array $credentials, array $config) {}

    public function testConnection(): array
    {
        return ['ok' => false, 'message' => 'Bugzilla integration coming soon.'];
    }

    public function findIssue(string $issueId): ?array
    {
        return null;
    }

    public function createIssue(array $data): array
    {
        throw new \RuntimeException('Bugzilla integration coming soon.');
    }

    public function getProjectsList(): array
    {
        return [];
    }
}
