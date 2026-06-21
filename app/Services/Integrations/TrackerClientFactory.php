<?php

namespace App\Services\Integrations;

use App\Models\Integration;
use InvalidArgumentException;

/**
 * Resolves the correct TrackerClient driver from an Integration model instance.
 */
class TrackerClientFactory
{
    /**
     * Build a TrackerClient for the given Integration.
     *
     * @throws InvalidArgumentException When the integration type is unknown.
     */
    public static function make(Integration $integration): TrackerClient
    {
        /** @var array<string, mixed> $creds */
        $creds = $integration->credentials ?? [];
        /** @var array<string, mixed> $config */
        $config = $integration->config ?? [];

        return match ($integration->integration_type) {
            'github' => new GitHubClient(
                token: (string) ($creds['token'] ?? ''),
                owner: (string) ($config['owner'] ?? ''),
                repo: (string) ($config['repo'] ?? ''),
            ),
            'jira' => new JiraClient(
                baseUrl: (string) ($config['base_url'] ?? ''),
                email: (string) ($creds['email'] ?? ''),
                token: (string) ($creds['token'] ?? ''),
                projectKey: (string) ($config['project_key'] ?? ''),
            ),
            'gitlab' => new GitLabClient(
                baseUrl: (string) ($config['base_url'] ?? 'https://gitlab.com'),
                token: (string) ($creds['token'] ?? ''),
                projectId: (string) ($config['project_id'] ?? ''),
            ),
            'youtrack' => new YouTrackClient(
                baseUrl: (string) ($config['base_url'] ?? ''),
                token: (string) ($creds['token'] ?? ''),
                projectId: (string) ($config['project_id'] ?? ''),
            ),
            'azure_devops' => new AzureDevOpsClient(
                token: (string) ($creds['token'] ?? ''),
                organization: (string) ($config['organization'] ?? ''),
                project: (string) ($config['project'] ?? ''),
            ),
            'bugzilla' => new BugzillaClient(
                baseUrl: (string) ($config['base_url'] ?? ''),
                apiKey: (string) ($creds['api_key'] ?? ''),
                product: (string) ($config['product'] ?? ''),
            ),
            'linear' => new LinearClient(
                apiKey: (string) ($creds['api_key'] ?? ''),
                teamId: (string) ($config['team_id'] ?? ''),
            ),
            default => throw new InvalidArgumentException(
                "Unknown integration type: [{$integration->integration_type}]"
            ),
        };
    }
}
