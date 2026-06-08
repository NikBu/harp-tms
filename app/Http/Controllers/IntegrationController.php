<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationController extends Controller
{
    /**
     * Available integration stubs.
     *
     * @var list<array{key: string, name: string, desc: string}>
     */
    private const INTEGRATIONS = [
        ['key' => 'jira', 'name' => 'Jira', 'desc' => 'Sync issues and link defects to test results.'],
        ['key' => 'github', 'name' => 'GitHub', 'desc' => 'Reference commits, issues and pull requests.'],
        ['key' => 'gitlab', 'name' => 'GitLab', 'desc' => 'Connect pipelines and merge requests.'],
        ['key' => 'slack', 'name' => 'Slack', 'desc' => 'Post run results to your channels.'],
        ['key' => 'pagerduty', 'name' => 'PagerDuty', 'desc' => 'Raise incidents from failed runs.'],
        ['key' => 'zapier', 'name' => 'Zapier', 'desc' => 'Automate workflows across thousands of apps.'],
        ['key' => 'jenkins', 'name' => 'Jenkins', 'desc' => 'Trigger and report automated test runs.'],
        ['key' => 'azure_devops', 'name' => 'Azure DevOps', 'desc' => 'Sync work items and pipelines.'],
    ];

    /**
     * Display the integrations grid for the project.
     */
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        return Inertia::render('integrations/index', [
            'project' => $project->only(['id', 'name']),
            'integrations' => self::INTEGRATIONS,
        ]);
    }

    /**
     * Ensure the current user may access the given project.
     */
    private function authorizeProjectAccess(Request $request, Project $project): void
    {
        $user = $request->user();

        if ($user->hasRole('admin')) {
            return;
        }

        abort_unless(
            $project->members()->whereKey($user->getKey())->exists(),
            403
        );
    }
}
