<?php

namespace App\Services\Integrations;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * GitHub Issues tracker driver.
 *
 * Required credentials:  token  (Personal Access Token or fine-grained PAT)
 * Required config:       owner  (org or user login)
 *                        repo   (repository slug)   — optional for testConnection
 */
class GitHubClient implements TrackerClient
{
    private const BASE = 'https://api.github.com';

    public function __construct(
        private readonly string $token,
        private readonly string $owner = '',
        private readonly string $repo  = '',
    ) {}

    // ── TrackerClient ─────────────────────────────────────────────────────────

    public function testConnection(): array
    {
        try {
            $response = $this->http()->get('/user');

            if ($response->successful()) {
                return ['ok' => true, 'message' => 'Connected as ' . ($response->json('login') ?? '(unknown)')];
            }

            return ['ok' => false, 'message' => $response->json('message') ?? 'Authentication failed'];
        } catch (ConnectionException $e) {
            return ['ok' => false, 'message' => 'Could not reach GitHub: ' . $e->getMessage()];
        }
    }

    public function findIssue(string $issueId): ?array
    {
        if (! $this->owner || ! $this->repo) {
            return null;
        }

        // GitHub issue IDs are numeric; strip any leading # if present
        $number = ltrim($issueId, '#');

        try {
            $response = $this->http()->get("/repos/{$this->owner}/{$this->repo}/issues/{$number}");

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();

            return [
                'id'       => (string) $data['number'],
                'title'    => $data['title'] ?? '',
                'status'   => $data['state'] ?? 'unknown',
                'url'      => $data['html_url'] ?? '',
                'assignee' => $data['assignee']['login'] ?? null,
                'priority' => null, // GitHub has no native priority field
            ];
        } catch (ConnectionException) {
            return null;
        }
    }

    public function getProjectsList(): array
    {
        try {
            // Return repos accessible by the token (first page, 50 items)
            $response = $this->http()->get('/user/repos', [
                'per_page' => 50,
                'sort'     => 'updated',
            ]);

            if (! $response->successful()) {
                return [];
            }

            return collect($response->json())
                ->map(fn (array $r) => [
                    'id'   => (string) $r['id'],
                    'key'  => $r['full_name'],
                    'name' => $r['full_name'],
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
        return Http::withToken($this->token)
            ->withHeaders(['Accept' => 'application/vnd.github+json', 'X-GitHub-Api-Version' => '2022-11-28'])
            ->baseUrl(self::BASE);
    }
}
