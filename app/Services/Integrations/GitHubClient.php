<?php

namespace App\Services\Integrations;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class GitHubClient implements TrackerClient
{
    private string $token;
    private string $owner;
    private string $repo;

    public function __construct(array $credentials, array $config)
    {
        $this->token = $credentials['token'] ?? '';

        // project_key is expected as "owner/repo"
        $parts       = explode('/', $config['project_key'] ?? '/');
        $this->owner = $parts[0] ?? '';
        $this->repo  = $parts[1] ?? '';
    }

    public function testConnection(): array
    {
        try {
            $response = $this->http()->get('user');

            if ($response->successful()) {
                return ['ok' => true, 'message' => $response->json('login')];
            }

            return ['ok' => false, 'message' => $response->json('message', 'Unauthorized')];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    public function findIssue(string $issueId): ?array
    {
        try {
            $number   = ltrim($issueId, '#');
            $response = $this->http()->get("repos/{$this->owner}/{$this->repo}/issues/{$number}");

            if ($response->status() === 404) {
                return null;
            }

            $data = $response->json();

            return [
                'id'       => (string) $data['number'],
                'title'    => $data['title'],
                'status'   => $data['state'],
                'url'      => $data['html_url'],
                'assignee' => $data['assignee']['login'] ?? null,
                'priority' => $this->labelPriority($data['labels'] ?? []),
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    public function createIssue(array $data): array
    {
        $response = $this->http()->post("repos/{$this->owner}/{$this->repo}/issues", [
            'title' => $data['title'],
            'body'  => $data['description'] ?? '',
            'labels' => array_filter([$data['priority'] ?? null]),
        ]);

        $response->throw();
        $issue = $response->json();

        return [
            'id'       => (string) $issue['number'],
            'title'    => $issue['title'],
            'status'   => $issue['state'],
            'url'      => $issue['html_url'],
            'assignee' => $issue['assignee']['login'] ?? null,
            'priority' => $data['priority'] ?? null,
        ];
    }

    public function getProjectsList(): array
    {
        try {
            $response = $this->http()->get('user/repos', [
                'per_page' => 100,
                'sort'     => 'updated',
            ]);

            return collect($response->json())->map(fn ($r) => [
                'id'   => (string) $r['id'],
                'key'  => $r['full_name'],
                'name' => $r['full_name'],
            ])->values()->all();
        } catch (\Throwable) {
            return [];
        }
    }

    private function http(): PendingRequest
    {
        return Http::withToken($this->token)
            ->baseUrl('https://api.github.com/')
            ->withHeaders(['Accept' => 'application/vnd.github+json', 'X-GitHub-Api-Version' => '2022-11-28']);
    }

    /** @param list<array{name: string}> $labels */
    private function labelPriority(array $labels): ?string
    {
        $map = ['critical', 'high', 'medium', 'low', 'priority: critical', 'priority: high', 'priority: medium', 'priority: low'];
        foreach ($labels as $label) {
            $name = strtolower($label['name'] ?? '');
            foreach ($map as $p) {
                if (str_contains($name, $p)) {
                    return $name;
                }
            }
        }
        return null;
    }
}
