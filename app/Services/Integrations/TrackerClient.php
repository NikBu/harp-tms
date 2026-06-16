<?php

namespace App\Services\Integrations;

/**
 * Contract every issue-tracker driver must satisfy.
 */
interface TrackerClient
{
    /**
     * Verify that the stored credentials are valid and the tracker is reachable.
     * Returns an array with at minimum a 'ok' bool key.
     *
     * @return array{ok: bool, message?: string}
     */
    public function testConnection(): array;

    /**
     * Fetch a single issue by its external ID / key.
     * Returns null when the issue does not exist or cannot be reached.
     *
     * @return array{id: string, title: string, status: string, url: string, assignee?: string|null, priority?: string|null}|null
     */
    public function findIssue(string $issueId): ?array;

    /**
     * Return a list of projects/repositories that the credential can access.
     * Used to populate the project-key picker in the configuration form.
     *
     * @return list<array{id: string, key: string, name: string}>
     */
    public function getProjectsList(): array;
}
