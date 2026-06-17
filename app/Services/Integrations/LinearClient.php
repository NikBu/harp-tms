<?php

namespace App\Services\Integrations;

class LinearClient implements TrackerClient
{
    public function __construct(array $credentials, array $config) {}

    public function testConnection(): array
    {
        return ['ok' => false, 'message' => 'Linear integration coming soon.'];
    }

    public function findIssue(string $issueId): ?array
    {
        return null;
    }

    public function createIssue(array $data): array
    {
        throw new \RuntimeException('Linear integration coming soon.');
    }

    public function getProjectsList(): array
    {
        return [];
    }
}
