<?php

namespace App\Services\Integrations;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class JiraClient implements TrackerClient
{
    private string $baseUrl;

    private string $email;

    private string $token;

    private string $projectKey;

    private ?string $issueType;

    public function __construct(array $credentials, array $config)
    {
        $this->baseUrl = rtrim($credentials['url'] ?? '', '/');
        $this->email = $credentials['email'] ?? '';
        $this->token = $credentials['token'] ?? '';
        $this->projectKey = $config['project_key'] ?? '';
        $this->issueType = $config['default_issue_type'] ?? 'Bug';
    }

    public function testConnection(): array
    {
        try {
            $response = $this->http()->get('rest/api/3/myself');

            if ($response->successful()) {
                return ['ok' => true, 'message' => $response->json('displayName')];
            }

            return ['ok' => false, 'message' => $response->json('message', 'Authentication failed')];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    public function findIssue(string $issueId): ?array
    {
        try {
            $key = strtoupper(trim($issueId));
            $response = $this->http()->get("rest/api/3/issue/{$key}", [
                'fields' => 'summary,status,assignee,priority',
            ]);

            if ($response->status() === 404) {
                return null;
            }

            $data = $response->json();
            $fields = $data['fields'] ?? [];

            return [
                'id' => $data['key'],
                'title' => $fields['summary'] ?? '',
                'status' => $fields['status']['name'] ?? 'Unknown',
                'url' => "{$this->baseUrl}/browse/{$data['key']}",
                'assignee' => $fields['assignee']['displayName'] ?? null,
                'priority' => $fields['priority']['name'] ?? null,
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    public function createIssue(array $data): array
    {
        $payload = [
            'fields' => [
                'project' => ['key' => $this->projectKey],
                'summary' => $data['title'],
                'description' => [
                    'type' => 'doc',
                    'version' => 1,
                    'content' => [[
                        'type' => 'paragraph',
                        'content' => [['type' => 'text', 'text' => $data['description'] ?? '']],
                    ]],
                ],
                'issuetype' => ['name' => $this->issueType ?? 'Bug'],
            ],
        ];

        if (! empty($data['priority'])) {
            $payload['fields']['priority'] = ['name' => ucfirst($data['priority'])];
        }

        $response = $this->http()->post('rest/api/3/issue', $payload);
        $response->throw();

        $created = $response->json();
        $key = $created['key'];

        // Fetch full issue so we return the same shape as findIssue()
        return $this->findIssue($key) ?? [
            'id' => $key,
            'title' => $data['title'],
            'status' => 'Open',
            'url' => "{$this->baseUrl}/browse/{$key}",
        ];
    }

    public function getProjectsList(): array
    {
        try {
            $response = $this->http()->get('rest/api/3/project/search', [
                'maxResults' => 100,
                'orderBy' => 'name',
            ]);

            $items = $response->json('values', []);

            return collect($items)->map(fn ($p) => [
                'id' => $p['id'],
                'key' => $p['key'],
                'name' => $p['name'],
            ])->values()->all();
        } catch (\Throwable) {
            return [];
        }
    }

    private function http(): PendingRequest
    {
        return Http::withBasicAuth($this->email, $this->token)
            ->baseUrl("{$this->baseUrl}/")
            ->withHeaders(['Accept' => 'application/json', 'Content-Type' => 'application/json']);
    }
}
