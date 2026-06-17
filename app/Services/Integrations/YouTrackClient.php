<?php

namespace App\Services\Integrations;

class YouTrackClient implements TrackerClient
{
    public function __construct(array $credentials, array $config) {}

    public function testConnection(): array
    {
        return ['ok' => false, 'message' => 'YouTrack integration coming soon.'];
    }

    public function findIssue(string $issueId): ?array
    {
        return null;
    }

    public function createIssue(array $data): array
    {
        throw new \RuntimeException('YouTrack integration coming soon.');
    }

    public function getProjectsList(): array
    {
        return [];
    }
}
