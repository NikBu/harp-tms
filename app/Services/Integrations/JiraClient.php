<?php

namespace App\Services\Integrations;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Jira Cloud tracker driver.
 *
 * Required credentials:  email  (Atlassian account e-mail)
 *                        token  (Jira API token)
 * Required config:       base_url  (https://yoursite.atlassian.net)
 *                        project_key  (e.g. "TMS") — optional for testConnection
 */
class JiraClient implements TrackerClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $email,
        private readonly string $token,
        private readonly string $projectKey = '',
    ) {}

    // ── TrackerClient ─────────────────────────────────────────────────────────

    public function testConnection(): array
    {
        try {
            $response = $this->http()->get('/rest/api/3/myself');

            if ($response->successful()) {
                $name = $response->json('displayName') ?? $response->json('name') ?? '(unknown)';
                return ['ok' => true, 'message' => 'Connected as ' . $name];
            }

            return ['ok' => false, 'message' => $response->json('message') ?? 'Authentication failed (HTTP ' . $response->status() . ')'];
        } catch (ConnectionException $e) {
            return ['ok' => false, 'message' => 'Could not reach Jira: ' . $e->getMessage()];
        }
    }

    public function findIssue(string $issueId): ?array
    {
        // issueId may be passed as "TMS-42" or just "42" — normalize
        $key = str_contains($issueId, '-')
            ? strtoupper($issueId)
            : strtoupper($this->projectKey) . '-' . $issueId;

        try {
            $response = $this->http()->get("/rest/api/3/issue/{$key}");

            if (! $response->successful()) {
                return null;
            }

            $data   = $response->json();
            $fields = $data['fields'] ?? [];

            return [
                'id'       => $data['key'],
                'title'    => $fields['summary'] ?? '',
                'status'   => $fields['status']['name'] ?? 'unknown',
                'url'      => rtrim($this->baseUrl, '/') . '/browse/' . $data['key'],
                'assignee' => $fields['assignee']['displayName'] ?? null,
                'priority' => $fields['priority']['name'] ?? null,
            ];
        } catch (ConnectionException) {
            return null;
        }
    }

    public function getProjectsList(): array
    {
        try {
            $response = $this->http()->get('/rest/api/3/project/search', [
                'maxResults' => 50,
                'orderBy'    => 'name',
            ]);

            if (! $response->successful()) {
                return [];
            }

            return collect($response->json('values', []))
                ->map(fn (array $p) => [
                    'id'   => $p['id'],
                    'key'  => $p['key'],
                    'name' => $p['name'],
                ])
                ->values()
                ->all();
        } catch (ConnectionException) {
            return [];
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withBasicAuth($this->email, $this->token)
            ->withHeaders(['Accept' => 'application/json', 'Content-Type' => 'application/json'])
            ->baseUrl(rtrim($this->baseUrl, '/'));
    }
}
