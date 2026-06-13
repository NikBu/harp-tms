<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Comment;
use App\Models\Configuration;
use App\Models\ConfigurationGroup;
use App\Models\CustomField;
use App\Models\CustomFieldOption;
use App\Models\Dashboard;
use App\Models\DashboardWidget;
use App\Models\DefectLink;
use App\Models\InstanceSetting;
use App\Models\Integration;
use App\Models\Milestone;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\RequirementComment;
use App\Models\RequirementFolder;
use App\Models\RequirementHistory;
use App\Models\SavedReport;
use App\Models\Section;
use App\Models\SharedStep;
use App\Models\SharedStepItem;
use App\Models\Suite;
use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestCaseCustomValue;
use App\Models\TestCaseHistory;
use App\Models\TestCaseParameter;
use App\Models\TestCaseParameterDataset;
use App\Models\TestCaseStep;
use App\Models\TestPlan;
use App\Models\TestPlanEntry;
use App\Models\TestResult;
use App\Models\TestResultChecklistItem;
use App\Models\TestResultCustomValue;
use App\Models\TestRun;
use App\Models\User;
use App\Models\Watcher;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Builds a deterministic, idempotent technical seed that exercises every table
 * and relationship in the schema. Data is intentionally synthetic.
 */
class TechnicalSeeder extends Seeder
{
    /**
     * Users keyed by role slug (admin, lead1, lead2, tester1, ...).
     *
     * @var array<string, User>
     */
    private array $users = [];

    /**
     * Projects keyed by slug (project-alpha, project-beta, project-gamma).
     *
     * @var array<string, Project>
     */
    private array $projects = [];

    /**
     * Configurations keyed by [project_slug][group_name][config_name].
     *
     * @var array<string, array<string, array<string, Configuration>>>
     */
    private array $configs = [];

    /**
     * Requirements keyed by display_id (REQ-001, ...).
     *
     * @var array<string, Requirement>
     */
    private array $requirements = [];

    /**
     * Requirement folders keyed by name.
     *
     * @var array<string, RequirementFolder>
     */
    private array $folders = [];

    /**
     * Shared steps keyed by title.
     *
     * @var array<string, SharedStep>
     */
    private array $sharedSteps = [];

    /**
     * Custom fields keyed by system_name.
     *
     * @var array<string, CustomField>
     */
    private array $customFields = [];

    /**
     * Suites keyed by readable label.
     *
     * @var array<string, Suite>
     */
    private array $suites = [];

    /**
     * Sections keyed by readable label.
     *
     * @var array<string, Section>
     */
    private array $sections = [];

    /**
     * Test cases keyed by their code (TC-001, ...).
     *
     * @var array<string, TestCase>
     */
    private array $testCases = [];

    /**
     * Milestones keyed by name.
     *
     * @var array<string, Milestone>
     */
    private array $milestones = [];

    /**
     * Test plans keyed by name.
     *
     * @var array<string, TestPlan>
     */
    private array $testPlans = [];

    /**
     * Test plan entries keyed by readable label.
     *
     * @var array<string, TestPlanEntry>
     */
    private array $planEntries = [];

    /**
     * Test runs keyed by readable label (run-a, run-b, run-c).
     *
     * @var array<string, TestRun>
     */
    private array $runs = [];

    /**
     * Tests keyed by "run-label|tc-code".
     *
     * @var array<string, Test>
     */
    private array $tests = [];

    /**
     * Results captured for downstream references (audit logs, defect links).
     *
     * @var array<string, TestResult>
     */
    private array $results = [];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $this->seedUsers();
            $this->seedProjects();
            $this->seedProjectMembers();
            $this->seedConfigurations();
            $this->seedRequirements();
            $this->seedSharedSteps();
            $this->seedCustomFields();
            $this->seedSuitesAndSections();
            $this->seedTestCases();
            $this->seedMilestones();
            $this->seedTestPlans();
            $this->seedTestRuns();
            $this->seedTestExecution();
            $this->seedWatchersAndComments();
            $this->seedWebhooks();
            $this->seedReportsAndDashboards();
            $this->seedIntegrations();
            $this->seedAuditLogs();
            $this->seedInstanceSettings();
        });
    }

    /**
     * Create (or fetch) a record on an append-only model that has no
     * updated_at and does not list created_at as fillable. We match on the
     * given attributes and force the remaining values, so the explicit
     * created_at is honoured instead of being silently discarded.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  class-string<TModel>  $model
     * @param  array<string, mixed>  $match
     * @param  array<string, mixed>  $values
     * @return TModel
     */
    private function firstOrForceCreate(string $model, array $match, array $values): Model
    {
        /** @var TModel $instance */
        $instance = $model::query()->firstOrNew($match);

        if (! $instance->exists) {
            $instance->forceFill(array_merge($match, $values))->save();
        }

        return $instance;
    }

    /**
     * Create the 8 fixed users and assign global Spatie roles.
     */
    private function seedUsers(): void
    {
        /** @var array<string, array{name: string, role: string}> $definitions */
        $definitions = [
            'admin' => ['email' => 'admin@harp.test', 'name' => 'Admin User', 'role' => 'admin'],
            'lead1' => ['email' => 'lead1@harp.test', 'name' => 'QA Lead One', 'role' => 'test-lead'],
            'lead2' => ['email' => 'lead2@harp.test', 'name' => 'QA Lead Two', 'role' => 'test-lead'],
            'tester1' => ['email' => 'tester1@harp.test', 'name' => 'Tester One', 'role' => 'tester'],
            'tester2' => ['email' => 'tester2@harp.test', 'name' => 'Tester Two', 'role' => 'tester'],
            'tester3' => ['email' => 'tester3@harp.test', 'name' => 'Tester Three', 'role' => 'tester'],
            'dev1' => ['email' => 'dev1@harp.test', 'name' => 'Developer One', 'role' => 'viewer'],
            'viewer1' => ['email' => 'viewer1@harp.test', 'name' => 'Viewer One', 'role' => 'viewer'],
        ];

        foreach ($definitions as $key => $definition) {
            $user = User::updateOrCreate(
                ['email' => $definition['email']],
                [
                    'name' => $definition['name'],
                    'password' => Hash::make('password'),
                    'timezone' => 'UTC',
                    'is_active' => true,
                    'email_verified_at' => now(),
                ],
            );

            $user->syncRoles([$definition['role']]);

            $this->users[$key] = $user;
        }
    }

    /**
     * Create one project per suite mode.
     */
    private function seedProjects(): void
    {
        $this->projects['project-alpha'] = Project::updateOrCreate(
            ['name' => 'Project Alpha'],
            [
                'description' => 'Single-suite project (suite_mode 1).',
                'suite_mode' => Project::SUITE_SINGLE,
                'created_by' => $this->users['admin']->id,
            ],
        );

        $this->projects['project-beta'] = Project::updateOrCreate(
            ['name' => 'Project Beta'],
            [
                'description' => 'Single-suite baseline project (suite_mode 2).',
                'suite_mode' => Project::SUITE_SINGLE_BASELINE,
                'created_by' => $this->users['lead1']->id,
            ],
        );

        $this->projects['project-gamma'] = Project::updateOrCreate(
            ['name' => 'Project Gamma'],
            [
                'description' => 'Multi-suite project (suite_mode 3).',
                'suite_mode' => Project::SUITE_MULTI,
                'created_by' => $this->users['lead2']->id,
            ],
        );
    }

    /**
     * Attach all users to projects with per-project roles.
     */
    private function seedProjectMembers(): void
    {
        $this->projects['project-alpha']->members()->syncWithoutDetaching([
            $this->users['admin']->id => ['role' => 'project_admin'],
            $this->users['lead1']->id => ['role' => 'lead'],
            $this->users['tester1']->id => ['role' => 'tester'],
            $this->users['tester2']->id => ['role' => 'tester'],
            $this->users['dev1']->id => ['role' => 'viewer'],
            $this->users['viewer1']->id => ['role' => 'viewer'],
        ]);

        $this->projects['project-beta']->members()->syncWithoutDetaching([
            $this->users['admin']->id => ['role' => 'project_admin'],
            $this->users['lead1']->id => ['role' => 'lead'],
            $this->users['lead2']->id => ['role' => 'lead'],
            $this->users['tester1']->id => ['role' => 'tester'],
            $this->users['tester3']->id => ['role' => 'tester'],
        ]);

        $this->projects['project-gamma']->members()->syncWithoutDetaching([
            $this->users['admin']->id => ['role' => 'project_admin'],
            $this->users['lead2']->id => ['role' => 'lead'],
            $this->users['tester2']->id => ['role' => 'tester'],
            $this->users['tester3']->id => ['role' => 'tester'],
            $this->users['dev1']->id => ['role' => 'viewer'],
        ]);
    }

    /**
     * Create a Browser x OS configuration matrix per project.
     */
    private function seedConfigurations(): void
    {
        /** @var array<string, list<string>> $matrix */
        $matrix = [
            'Browser' => ['Chrome', 'Firefox', 'Safari'],
            'OS' => ['Windows', 'macOS', 'Linux'],
        ];

        foreach ($this->projects as $slug => $project) {
            foreach ($matrix as $groupName => $configNames) {
                $group = ConfigurationGroup::firstOrCreate([
                    'project_id' => $project->id,
                    'name' => $groupName,
                ]);

                foreach ($configNames as $configName) {
                    $this->configs[$slug][$groupName][$configName] = Configuration::firstOrCreate([
                        'group_id' => $group->id,
                        'name' => $configName,
                    ]);
                }
            }
        }
    }

    /**
     * Create requirement folders, requirements, history and threaded comments.
     */
    private function seedRequirements(): void
    {
        $project = $this->projects['project-alpha'];

        $this->folders['Core Features'] = RequirementFolder::firstOrCreate(
            ['project_id' => $project->id, 'parent_id' => null, 'name' => 'Core Features'],
            ['display_order' => 0],
        );

        $this->folders['Authentication'] = RequirementFolder::firstOrCreate(
            [
                'project_id' => $project->id,
                'parent_id' => $this->folders['Core Features']->id,
                'name' => 'Authentication',
            ],
            ['display_order' => 0],
        );

        /** @var list<array<string, mixed>> $definitions */
        $definitions = [
            ['display_id' => 'REQ-001', 'title' => 'User Login', 'type' => 'functional', 'priority' => 'critical', 'status' => 'approved', 'folder' => 'Authentication'],
            ['display_id' => 'REQ-002', 'title' => 'User Registration', 'type' => 'functional', 'priority' => 'high', 'status' => 'approved', 'folder' => 'Authentication'],
            ['display_id' => 'REQ-003', 'title' => 'Password Reset', 'type' => 'functional', 'priority' => 'medium', 'status' => 'under_review', 'folder' => 'Authentication'],
            ['display_id' => 'REQ-004', 'title' => 'Dashboard Overview', 'type' => 'functional', 'priority' => 'high', 'status' => 'approved', 'folder' => 'Core Features'],
            ['display_id' => 'REQ-005', 'title' => 'Performance SLA', 'type' => 'non_functional', 'priority' => 'critical', 'status' => 'approved', 'folder' => 'Core Features'],
        ];

        foreach ($definitions as $definition) {
            $requirement = Requirement::updateOrCreate(
                ['project_id' => $project->id, 'display_id' => $definition['display_id']],
                [
                    'folder_id' => $this->folders[$definition['folder']]->id,
                    'title' => $definition['title'],
                    'type' => $definition['type'],
                    'priority' => $definition['priority'],
                    'status' => $definition['status'],
                    'source' => 'manual',
                    'created_by' => $this->users['lead1']->id,
                    'updated_by' => $this->users['lead1']->id,
                ],
            );

            $this->requirements[$definition['display_id']] = $requirement;

            $this->firstOrForceCreate(
                RequirementHistory::class,
                [
                    'requirement_id' => $requirement->id,
                    'field_name' => 'status',
                    'new_value' => $definition['status'],
                ],
                [
                    'changed_by' => $this->users['lead1']->id,
                    'old_value' => 'draft',
                    'created_at' => now(),
                ],
            );
        }

        $comment = RequirementComment::firstOrCreate(
            [
                'requirement_id' => $this->requirements['REQ-001']->id,
                'parent_id' => null,
                'user_id' => $this->users['lead1']->id,
                'body' => 'Verified against acceptance criteria',
            ],
        );

        RequirementComment::firstOrCreate(
            [
                'requirement_id' => $this->requirements['REQ-001']->id,
                'parent_id' => $comment->id,
                'user_id' => $this->users['tester1']->id,
                'body' => 'Confirmed, all scenarios covered',
            ],
        );
    }

    /**
     * Create reusable shared step blocks with ordered items.
     */
    private function seedSharedSteps(): void
    {
        $project = $this->projects['project-alpha'];

        $loginFlow = SharedStep::firstOrCreate(
            ['project_id' => $project->id, 'title' => 'Login Flow'],
            ['created_by' => $this->users['lead1']->id],
        );
        $this->sharedSteps['Login Flow'] = $loginFlow;

        /** @var list<array{content: string, expected: string}> $loginItems */
        $loginItems = [
            ['content' => 'Navigate to login page', 'expected' => 'Login page is displayed'],
            ['content' => 'Enter valid credentials', 'expected' => 'Credentials accepted'],
            ['content' => 'Click Login button', 'expected' => 'User is redirected to dashboard'],
        ];

        foreach ($loginItems as $index => $item) {
            SharedStepItem::firstOrCreate(
                ['shared_step_id' => $loginFlow->id, 'step_index' => $index],
                ['content' => $item['content'], 'expected' => $item['expected']],
            );
        }

        $apiAuth = SharedStep::firstOrCreate(
            ['project_id' => $project->id, 'title' => 'API Auth Header'],
            ['created_by' => $this->users['lead1']->id],
        );
        $this->sharedSteps['API Auth Header'] = $apiAuth;

        /** @var list<array{content: string, expected: string}> $apiItems */
        $apiItems = [
            ['content' => 'Set Authorization header with valid token', 'expected' => 'Header accepted'],
            ['content' => 'Send request', 'expected' => 'Response status 200'],
        ];

        foreach ($apiItems as $index => $item) {
            SharedStepItem::firstOrCreate(
                ['shared_step_id' => $apiAuth->id, 'step_index' => $index],
                ['content' => $item['content'], 'expected' => $item['expected']],
            );
        }
    }

    /**
     * Create custom fields, dropdown options and project assignments.
     */
    private function seedCustomFields(): void
    {
        $browser = CustomField::updateOrCreate(
            ['system_name' => 'cf_browser'],
            [
                'label' => 'Browser',
                'field_type' => 'dropdown',
                'applies_to' => 'cases',
                'is_global' => false,
                'created_by' => $this->users['admin']->id,
            ],
        );
        $this->customFields['cf_browser'] = $browser;

        /** @var array<int, string> $options */
        $options = [1 => 'Chrome', 2 => 'Firefox', 3 => 'Safari', 4 => 'Edge'];
        foreach ($options as $key => $label) {
            CustomFieldOption::firstOrCreate(
                ['custom_field_id' => $browser->id, 'option_key' => $key],
                ['option_label' => $label, 'display_order' => $key - 1],
            );
        }

        $this->customFields['cf_automated'] = CustomField::updateOrCreate(
            ['system_name' => 'cf_automated'],
            [
                'label' => 'Automated',
                'field_type' => 'checkbox',
                'applies_to' => 'cases',
                'is_global' => true,
                'created_by' => $this->users['admin']->id,
            ],
        );

        $this->customFields['cf_notes'] = CustomField::updateOrCreate(
            ['system_name' => 'cf_notes'],
            [
                'label' => 'Execution Notes',
                'field_type' => 'text',
                'applies_to' => 'results',
                'is_global' => true,
                'created_by' => $this->users['admin']->id,
            ],
        );

        $alphaId = $this->projects['project-alpha']->id;
        $betaId = $this->projects['project-beta']->id;

        /** @var list<array{custom_field_id: int, project_id: int, is_required: bool, display_order: int}> $assignments */
        $assignments = [
            ['custom_field_id' => $browser->id, 'project_id' => $alphaId, 'is_required' => false, 'display_order' => 0],
            ['custom_field_id' => $this->customFields['cf_automated']->id, 'project_id' => $alphaId, 'is_required' => false, 'display_order' => 1],
            ['custom_field_id' => $this->customFields['cf_automated']->id, 'project_id' => $betaId, 'is_required' => false, 'display_order' => 0],
            ['custom_field_id' => $this->customFields['cf_notes']->id, 'project_id' => $betaId, 'is_required' => false, 'display_order' => 1],
        ];

        foreach ($assignments as $assignment) {
            $exists = DB::table('custom_field_project')
                ->where('custom_field_id', $assignment['custom_field_id'])
                ->where('project_id', $assignment['project_id'])
                ->exists();

            if (! $exists) {
                DB::table('custom_field_project')->insert($assignment);
            }
        }
    }

    /**
     * Create suites and nested sections per project, matching suite modes.
     */
    private function seedSuitesAndSections(): void
    {
        $alpha = $this->projects['project-alpha'];

        $mainSuite = Suite::firstOrCreate(
            ['project_id' => $alpha->id, 'name' => 'Main Suite'],
            ['created_by' => $this->users['admin']->id],
        );
        $this->suites['Main Suite'] = $mainSuite;

        $auth = $this->makeSection($mainSuite, null, 'Authentication', 0, 0);
        $this->makeSection($mainSuite, $auth, 'Login', 1, 0);
        $this->makeSection($mainSuite, $auth, 'Registration', 1, 1);
        $this->makeSection($mainSuite, null, 'Dashboard', 0, 1);
        $this->makeSection($mainSuite, null, 'API', 0, 2);

        $beta = $this->projects['project-beta'];
        $baselineSuite = Suite::firstOrCreate(
            ['project_id' => $beta->id, 'name' => 'Baseline Suite'],
            ['created_by' => $this->users['lead1']->id],
        );
        $this->suites['Baseline Suite'] = $baselineSuite;
        $this->makeSection($baselineSuite, null, 'Core', 0, 0);

        $gamma = $this->projects['project-gamma'];
        $frontendSuite = Suite::firstOrCreate(
            ['project_id' => $gamma->id, 'name' => 'Frontend Suite'],
            ['created_by' => $this->users['lead2']->id],
        );
        $this->suites['Frontend Suite'] = $frontendSuite;
        $this->makeSection($frontendSuite, null, 'UI Components', 0, 0);

        $backendSuite = Suite::firstOrCreate(
            ['project_id' => $gamma->id, 'name' => 'Backend Suite'],
            ['created_by' => $this->users['lead2']->id],
        );
        $this->suites['Backend Suite'] = $backendSuite;
        $this->makeSection($backendSuite, null, 'Endpoints', 0, 0);
    }

    /**
     * Create a section and register it under a readable key "Suite > Name".
     */
    private function makeSection(Suite $suite, ?Section $parent, string $name, int $depth, int $order): Section
    {
        $section = Section::firstOrCreate(
            [
                'suite_id' => $suite->id,
                'parent_id' => $parent?->id,
                'name' => $name,
            ],
            [
                'depth' => $depth,
                'display_order' => $order,
            ],
        );

        $this->sections[$suite->name.' > '.$name] = $section;

        return $section;
    }

    /**
     * Create 15 test cases covering all five templates plus their relations.
     */
    private function seedTestCases(): void
    {
        $suite = $this->suites['Main Suite'];

        $login = $this->sections['Main Suite > Login'];
        $registration = $this->sections['Main Suite > Registration'];
        $dashboard = $this->sections['Main Suite > Dashboard'];
        $api = $this->sections['Main Suite > API'];

        // TC-001 — steps template, shared step embed, requirement link.
        $tc001 = $this->makeCase($suite, $login, 'TC-001 Login with valid credentials', 'steps', 'critical', 'approved', [
            ['content' => 'Open browser', 'expected' => 'Browser opens'],
            ['content' => 'Navigate to /login', 'expected' => 'Login form shown'],
            ['content' => 'Enter admin@harp.test / password', 'expected' => 'Fields populated'],
            ['content' => 'Click Submit', 'expected' => 'Redirected to dashboard'],
        ]);
        $this->embedSharedStep($tc001, $this->sharedSteps['Login Flow'], 0);
        $this->linkRequirement('REQ-001', $tc001);

        // TC-002 — steps template.
        $tc002 = $this->makeCase($suite, $login, 'TC-002 Login with invalid credentials', 'steps', 'high', 'approved', [
            ['content' => 'Enter invalid email', 'expected' => 'Error shown'],
            ['content' => 'Enter wrong password', 'expected' => 'Auth failed message'],
        ]);
        $this->linkRequirement('REQ-001', $tc002);

        // TC-003 — steps template.
        $tc003 = $this->makeCase($suite, $registration, 'TC-003 Register new user', 'steps', 'high', 'approved', [
            ['content' => 'Fill registration form', 'expected' => 'Form fields valid'],
            ['content' => 'Submit', 'expected' => 'Account created email sent'],
        ]);
        $this->linkRequirement('REQ-002', $tc003);

        // TC-004 — exploratory template.
        $this->makeCase($suite, $login, 'TC-004 Exploratory session: auth edge cases', 'exploratory', 'medium', 'draft', [], [
            'preconditions' => 'App running at localhost:8000',
            'expected_result' => 'Charter: Explore edge cases in auth flow. Time-box: 30 min.',
        ]);

        // TC-005 — BDD template with parameters and datasets.
        $tc005 = $this->makeCase($suite, $login, 'TC-005 BDD: Successful login', 'bdd', 'high', 'approved', [], [
            'bdd_scenario' => "Feature: User Authentication\n  Scenario: Successful login\n    Given I am on the login page\n    When I enter valid credentials\n    Then I should be redirected to the dashboard",
        ]);
        $this->linkRequirement('REQ-001', $tc005);

        // TC-006 — checklist template.
        $this->makeCase($suite, $dashboard, 'TC-006 Deployment checklist', 'checklist', 'critical', 'approved', [], [
            'checklist_items' => [
                ['label' => 'Database migrations run', 'is_optional' => false],
                ['label' => 'Cache cleared', 'is_optional' => false],
                ['label' => 'Config cached', 'is_optional' => false],
                ['label' => 'Queue workers restarted', 'is_optional' => false],
                ['label' => 'Smoke test passed', 'is_optional' => false],
                ['label' => 'Monitoring alerts active', 'is_optional' => true],
            ],
        ]);
        $this->linkRequirement('REQ-004', $this->testCases['TC-006']);

        // TC-007 — text template, two requirement links.
        $this->makeCase($suite, $dashboard, 'TC-007 Dashboard loads within SLA', 'text', 'critical', 'approved', [], [
            'expected_result' => 'Dashboard page must load within 2 seconds under 100 concurrent users as per NFR-PERF-001.',
        ]);
        $this->linkRequirement('REQ-004', $this->testCases['TC-007']);
        $this->linkRequirement('REQ-005', $this->testCases['TC-007']);

        // TC-008 — steps template, shared step embed.
        $tc008 = $this->makeCase($suite, $api, 'TC-008 API login endpoint', 'steps', 'high', 'approved', [
            ['content' => 'POST /api/login with valid creds', 'expected' => '200 OK with token'],
            ['content' => 'POST /api/login with invalid creds', 'expected' => '401 Unauthorized'],
        ]);
        $this->embedSharedStep($tc008, $this->sharedSteps['API Auth Header'], 0);
        $this->linkRequirement('REQ-001', $tc008);

        // TC-009..TC-015 — additional coverage with cycling templates/statuses.
        $tc009 = $this->makeCase($suite, $registration, 'TC-009 Register duplicate email', 'steps', 'medium', 'review', [
            ['content' => 'Submit existing email', 'expected' => 'Duplicate email error shown'],
        ]);
        $this->linkRequirement('REQ-002', $tc009);

        $this->makeCase($suite, $registration, 'TC-010 Registration field validation', 'text', 'low', 'draft', [], [
            'expected_result' => 'All registration fields enforce required/format validation.',
        ]);

        $tc011 = $this->makeCase($suite, $dashboard, 'TC-011 Dashboard widget rendering', 'bdd', 'medium', 'approved', [], [
            'bdd_scenario' => "Feature: Dashboard\n  Scenario: Widgets render\n    Given I am logged in\n    When I open the dashboard\n    Then all widgets are visible",
        ]);
        $this->linkRequirement('REQ-004', $tc011);

        $this->makeCase($suite, $api, 'TC-012 API logout endpoint', 'steps', 'medium', 'review', [
            ['content' => 'POST /api/logout with valid token', 'expected' => '204 No Content'],
        ]);

        $this->makeCase($suite, $api, 'TC-013 API rate limiting', 'checklist', 'high', 'approved', [], [
            'checklist_items' => [
                ['label' => 'Burst within limit allowed', 'is_optional' => false],
                ['label' => 'Burst over limit returns 429', 'is_optional' => false],
            ],
        ]);

        $tc014 = $this->makeCase($suite, $login, 'TC-014 Password reset request', 'steps', 'medium', 'draft', [
            ['content' => 'Request password reset', 'expected' => 'Reset email queued'],
        ]);
        $this->linkRequirement('REQ-003', $tc014);

        $this->makeCase($suite, $login, 'TC-015 Login session timeout', 'text', 'low', 'approved', [], [
            'expected_result' => 'Idle sessions expire after the configured session timeout.',
        ]);

        $this->seedTestCaseCustomValues();
        $this->seedTestCaseHistory();
        $this->seedTestCaseParameters();
    }

    /**
     * Create a single test case, its steps, and register it by code.
     *
     * @param  list<array{content: string, expected: string}>  $steps
     * @param  array<string, mixed>  $extra
     */
    private function makeCase(Suite $suite, Section $section, string $title, string $template, string $priority, string $status, array $steps = [], array $extra = []): TestCase
    {
        $code = substr($title, 0, 6);

        $testCase = TestCase::firstOrCreate(
            ['suite_id' => $suite->id, 'title' => $title],
            array_merge([
                'section_id' => $section->id,
                'template' => $template,
                'priority' => $priority,
                'status' => $status,
                'created_by' => $this->users['lead1']->id,
                'updated_by' => $this->users['lead1']->id,
            ], $extra),
        );

        foreach ($steps as $index => $step) {
            TestCaseStep::firstOrCreate(
                ['test_case_id' => $testCase->id, 'step_index' => $index],
                ['content' => $step['content'], 'expected' => $step['expected']],
            );
        }

        $this->testCases[$code] = $testCase;

        return $testCase;
    }

    /**
     * Embed a shared step into a test case at the given position.
     */
    private function embedSharedStep(TestCase $testCase, SharedStep $sharedStep, int $position): void
    {
        $exists = DB::table('test_case_shared_steps')
            ->where('test_case_id', $testCase->id)
            ->where('shared_step_id', $sharedStep->id)
            ->exists();

        if (! $exists) {
            DB::table('test_case_shared_steps')->insert([
                'test_case_id' => $testCase->id,
                'shared_step_id' => $sharedStep->id,
                'position' => $position,
            ]);
        }
    }

    /**
     * Link a requirement to a test case via the pivot with audit columns.
     */
    private function linkRequirement(string $requirementCode, TestCase $testCase): void
    {
        $requirementId = $this->requirements[$requirementCode]->id;

        $exists = DB::table('requirement_test_case')
            ->where('requirement_id', $requirementId)
            ->where('test_case_id', $testCase->id)
            ->exists();

        if (! $exists) {
            DB::table('requirement_test_case')->insert([
                'requirement_id' => $requirementId,
                'test_case_id' => $testCase->id,
                'created_by' => $this->users['lead1']->id,
                'created_at' => now(),
            ]);
        }
    }

    /**
     * Attach case-level custom values to each approved steps-template case.
     */
    private function seedTestCaseCustomValues(): void
    {
        foreach ($this->testCases as $testCase) {
            if ($testCase->template !== 'steps' || $testCase->status !== 'approved') {
                continue;
            }

            TestCaseCustomValue::firstOrCreate(
                ['test_case_id' => $testCase->id, 'custom_field_id' => $this->customFields['cf_automated']->id],
                ['value_boolean' => false],
            );

            TestCaseCustomValue::firstOrCreate(
                ['test_case_id' => $testCase->id, 'custom_field_id' => $this->customFields['cf_browser']->id],
                ['value_json' => [1]],
            );
        }
    }

    /**
     * Add a history snapshot for TC-001.
     */
    private function seedTestCaseHistory(): void
    {
        $tc001 = $this->testCases['TC-001'];

        $this->firstOrForceCreate(
            TestCaseHistory::class,
            ['test_case_id' => $tc001->id, 'change_note' => 'Approved after review'],
            [
                'snapshot' => ['title' => $tc001->title, 'status' => 'draft'],
                'changed_by' => $this->users['lead1']->id,
                'changed_fields' => ['status', 'title'],
                'created_at' => now(),
            ],
        );
    }

    /**
     * Create BDD parameters and datasets for TC-005.
     */
    private function seedTestCaseParameters(): void
    {
        $tc005 = $this->testCases['TC-005'];

        foreach (['username', 'password'] as $name) {
            TestCaseParameter::firstOrCreate(
                ['test_case_id' => $tc005->id, 'name' => $name],
            );
        }

        /** @var list<array<string, string>> $datasets */
        $datasets = [
            ['username' => 'admin@harp.test', 'password' => 'password'],
            ['username' => 'tester1@harp.test', 'password' => 'password'],
        ];

        foreach ($datasets as $index => $values) {
            TestCaseParameterDataset::firstOrCreate(
                ['test_case_id' => $tc005->id, 'display_order' => $index],
                ['dataset_name' => 'Dataset '.($index + 1), 'values' => $values],
            );
        }
    }

    /**
     * Create milestones with nested sub-milestones.
     */
    private function seedMilestones(): void
    {
        $project = $this->projects['project-alpha'];
        $today = Carbon::today();

        $release = Milestone::updateOrCreate(
            ['project_id' => $project->id, 'parent_id' => null, 'name' => 'v1.0 Release'],
            [
                'status' => 'active',
                'start_on' => $today->toDateString(),
                'due_on' => $today->copy()->addDays(30)->toDateString(),
                'created_by' => $this->users['lead1']->id,
            ],
        );
        $this->milestones['v1.0 Release'] = $release;

        $this->milestones['Sprint 1'] = Milestone::updateOrCreate(
            ['project_id' => $project->id, 'parent_id' => $release->id, 'name' => 'Sprint 1'],
            [
                'status' => 'completed',
                'due_on' => $today->copy()->addDays(7)->toDateString(),
                'is_completed' => true,
                'completed_at' => now(),
                'created_by' => $this->users['lead1']->id,
            ],
        );

        $this->milestones['Sprint 2'] = Milestone::updateOrCreate(
            ['project_id' => $project->id, 'parent_id' => $release->id, 'name' => 'Sprint 2'],
            [
                'status' => 'active',
                'due_on' => $today->copy()->addDays(14)->toDateString(),
                'created_by' => $this->users['lead1']->id,
            ],
        );

        $this->milestones['v1.1 Patch'] = Milestone::updateOrCreate(
            ['project_id' => $project->id, 'parent_id' => null, 'name' => 'v1.1 Patch'],
            [
                'status' => 'upcoming',
                'due_on' => $today->copy()->addDays(60)->toDateString(),
                'created_by' => $this->users['lead1']->id,
            ],
        );
    }

    /**
     * Create test plans with entries and per-entry configuration matrices.
     */
    private function seedTestPlans(): void
    {
        $project = $this->projects['project-alpha'];
        $today = Carbon::today();

        $fullRegression = TestPlan::updateOrCreate(
            ['project_id' => $project->id, 'name' => 'v1.0 Full Regression'],
            [
                'milestone_id' => $this->milestones['v1.0 Release']->id,
                'created_by' => $this->users['lead1']->id,
                'start_on' => $today->toDateString(),
                'end_on' => $today->copy()->addDays(14)->toDateString(),
            ],
        );
        $this->testPlans['v1.0 Full Regression'] = $fullRegression;

        $this->testPlans['Sprint 1 Smoke'] = TestPlan::updateOrCreate(
            ['project_id' => $project->id, 'name' => 'Sprint 1 Smoke'],
            [
                'milestone_id' => $this->milestones['Sprint 1']->id,
                'created_by' => $this->users['lead1']->id,
                'is_completed' => true,
                'completed_at' => now(),
            ],
        );
    }

    /**
     * Create the standalone and plan-linked test runs, configs and case lists.
     */
    private function seedTestRuns(): void
    {
        $project = $this->projects['project-alpha'];
        $suite = $this->suites['Main Suite'];
        $plan = $this->testPlans['v1.0 Full Regression'];
        $milestone = $this->milestones['v1.0 Release'];
        $alpha = 'project-alpha';

        $runA = TestRun::updateOrCreate(
            ['project_id' => $project->id, 'name' => 'Auth Suite Run'],
            [
                'suite_id' => $suite->id,
                'plan_id' => $plan->id,
                'milestone_id' => $milestone->id,
                'include_all' => false,
                'created_by' => $this->users['lead1']->id,
                'assigned_to' => $this->users['tester1']->id,
            ],
        );
        $this->runs['run-a'] = $runA;
        $this->attachRunConfigs($runA, [
            $this->configs[$alpha]['Browser']['Chrome'],
            $this->configs[$alpha]['OS']['Windows'],
        ]);
        $this->attachRunCases($runA, ['TC-001', 'TC-002', 'TC-003', 'TC-005']);

        $runB = TestRun::updateOrCreate(
            ['project_id' => $project->id, 'name' => 'Dashboard Run'],
            [
                'suite_id' => $suite->id,
                'plan_id' => $plan->id,
                'milestone_id' => $milestone->id,
                'include_all' => false,
                'created_by' => $this->users['lead1']->id,
                'assigned_to' => $this->users['tester2']->id,
            ],
        );
        $this->runs['run-b'] = $runB;
        $this->attachRunConfigs($runB, [
            $this->configs[$alpha]['Browser']['Firefox'],
            $this->configs[$alpha]['OS']['macOS'],
        ]);
        $this->attachRunCases($runB, ['TC-006', 'TC-007']);

        $runC = TestRun::updateOrCreate(
            ['project_id' => $project->id, 'name' => 'Standalone API Run'],
            [
                'suite_id' => $suite->id,
                'plan_id' => null,
                'include_all' => false,
                'created_by' => $this->users['admin']->id,
            ],
        );
        $this->runs['run-c'] = $runC;
        $this->attachRunCases($runC, ['TC-008']);

        $this->seedTestPlanEntries();
    }

    /**
     * Attach configurations to a run via the test_run_configs pivot.
     *
     * @param  list<Configuration>  $configurations
     */
    private function attachRunConfigs(TestRun $run, array $configurations): void
    {
        foreach ($configurations as $configuration) {
            $exists = DB::table('test_run_configs')
                ->where('test_run_id', $run->id)
                ->where('configuration_id', $configuration->id)
                ->exists();

            if (! $exists) {
                DB::table('test_run_configs')->insert([
                    'test_run_id' => $run->id,
                    'configuration_id' => $configuration->id,
                ]);
            }
        }
    }

    /**
     * Attach manually selected cases to a run via test_run_cases.
     *
     * @param  list<string>  $caseCodes
     */
    private function attachRunCases(TestRun $run, array $caseCodes): void
    {
        foreach ($caseCodes as $code) {
            DB::table('test_run_cases')->updateOrInsert([
                'test_run_id' => $run->id,
                'test_case_id' => $this->testCases[$code]->id,
            ]);
        }
    }

    /**
     * Create plan entries linking the full regression plan to runs A and B.
     */
    private function seedTestPlanEntries(): void
    {
        $plan = $this->testPlans['v1.0 Full Regression'];
        $alpha = 'project-alpha';

        $entry1 = TestPlanEntry::updateOrCreate(
            ['plan_id' => $plan->id, 'run_id' => $this->runs['run-a']->id],
            ['assigned_to' => $this->users['tester1']->id],
        );
        $this->planEntries['entry1'] = $entry1;
        $this->attachPlanEntryConfigs($entry1, [
            $this->configs[$alpha]['Browser']['Chrome'],
            $this->configs[$alpha]['OS']['Windows'],
        ]);

        $entry2 = TestPlanEntry::updateOrCreate(
            ['plan_id' => $plan->id, 'run_id' => $this->runs['run-b']->id],
            ['assigned_to' => $this->users['tester2']->id],
        );
        $this->planEntries['entry2'] = $entry2;
        $this->attachPlanEntryConfigs($entry2, [
            $this->configs[$alpha]['Browser']['Firefox'],
            $this->configs[$alpha]['OS']['macOS'],
        ]);
    }

    /**
     * Attach configurations to a plan entry via test_plan_entry_configs.
     *
     * @param  list<Configuration>  $configurations
     */
    private function attachPlanEntryConfigs(TestPlanEntry $entry, array $configurations): void
    {
        foreach ($configurations as $configuration) {
            $exists = DB::table('test_plan_entry_configs')
                ->where('test_plan_entry_id', $entry->id)
                ->where('configuration_id', $configuration->id)
                ->exists();

            if (! $exists) {
                DB::table('test_plan_entry_configs')->insert([
                    'test_plan_entry_id' => $entry->id,
                    'configuration_id' => $configuration->id,
                ]);
            }
        }
    }

    /**
     * Create tests then their append-only results and dependent records.
     */
    private function seedTestExecution(): void
    {
        $this->makeTest('run-a', 'TC-001', $this->users['tester1']->id);
        $this->makeTest('run-a', 'TC-002', $this->users['tester1']->id);
        $this->makeTest('run-a', 'TC-003', $this->users['tester1']->id);
        $this->makeTest('run-a', 'TC-005', $this->users['tester1']->id);
        $this->makeTest('run-b', 'TC-006', $this->users['tester2']->id);
        $this->makeTest('run-b', 'TC-007', $this->users['tester2']->id);
        $this->makeTest('run-c', 'TC-008', null);

        $this->seedResultsForTc001();
        $this->seedSimpleResult('run-a', 'TC-002', 'passed', 60, 'tester1');
        $this->seedSimpleResult('run-a', 'TC-003', 'blocked', null, 'tester1', 'Registration endpoint down');
        $this->seedSimpleResult('run-a', 'TC-005', 'passed', 45, 'tester1');
        $this->seedTc006Result();
        $this->seedTc007Result();
        // TC-008 in Run C intentionally remains 'untested' (no result added).

        $this->runs['run-a']->update([
            'passed_count' => 3,
            'failed_count' => 0,
            'blocked_count' => 1,
            'untested_count' => 0,
            'retest_count' => 0,
            'skipped_count' => 0,
        ]);

        $this->runs['run-b']->update(['passed_count' => 2]);
        $this->runs['run-c']->update(['untested_count' => 1]);
    }

    /**
     * Create a test row for a run/case pair and register it.
     */
    private function makeTest(string $runLabel, string $caseCode, ?int $assignedTo): Test
    {
        $test = Test::firstOrCreate(
            [
                'run_id' => $this->runs[$runLabel]->id,
                'case_id' => $this->testCases[$caseCode]->id,
            ],
            [
                'assigned_to' => $assignedTo,
                'status' => 'untested',
            ],
        );

        $this->tests[$runLabel.'|'.$caseCode] = $test;

        return $test;
    }

    /**
     * TC-001: failed then passed result; defect link on the failed result.
     */
    private function seedResultsForTc001(): void
    {
        $test = $this->tests['run-a|TC-001'];

        /** @var TestResult $failed */
        $failed = $this->firstOrForceCreate(
            TestResult::class,
            ['test_id' => $test->id, 'status' => 'failed'],
            [
                'run_id' => $test->run_id,
                'case_id' => $test->case_id,
                'comment' => 'Login redirect broken',
                'elapsed' => 120,
                'created_by' => $this->users['tester1']->id,
                'created_at' => now()->subHours(2),
            ],
        );
        $this->results['tc001-failed'] = $failed;

        $this->firstOrForceCreate(
            TestResult::class,
            ['test_id' => $test->id, 'status' => 'passed'],
            [
                'run_id' => $test->run_id,
                'case_id' => $test->case_id,
                'comment' => 'Fixed after bug fix',
                'elapsed' => 95,
                'created_by' => $this->users['tester1']->id,
                'created_at' => now()->subHour(),
            ],
        );

        $test->update(['status' => 'passed']);

        $this->firstOrForceCreate(
            DefectLink::class,
            ['test_result_id' => $failed->id, 'tracker_type' => 'github', 'external_id' => '123'],
            [
                'external_url' => 'https://github.com/example/repo/issues/123',
                'title' => 'Login redirect broken',
                'status' => 'closed',
                'created_by' => $this->users['tester1']->id,
                'created_at' => now()->subHours(2),
            ],
        );
    }

    /**
     * Create a single result for a test and sync the parent test status.
     */
    private function seedSimpleResult(string $runLabel, string $caseCode, string $status, ?int $elapsed, string $userKey, ?string $comment = null): TestResult
    {
        $test = $this->tests[$runLabel.'|'.$caseCode];

        /** @var TestResult $result */
        $result = $this->firstOrForceCreate(
            TestResult::class,
            ['test_id' => $test->id, 'status' => $status],
            [
                'run_id' => $test->run_id,
                'case_id' => $test->case_id,
                'comment' => $comment,
                'elapsed' => $elapsed,
                'created_by' => $this->users[$userKey]->id,
                'created_at' => now(),
            ],
        );

        $test->update(['status' => $status]);

        return $result;
    }

    /**
     * TC-006: passing result with per-item checklist outcomes.
     */
    private function seedTc006Result(): void
    {
        $result = $this->seedSimpleResult('run-b', 'TC-006', 'passed', 300, 'tester2');

        /** @var array<int, string> $itemStatuses */
        $itemStatuses = [0 => 'passed', 1 => 'passed', 2 => 'passed', 3 => 'passed', 4 => 'passed', 5 => 'na'];

        foreach ($itemStatuses as $index => $status) {
            TestResultChecklistItem::firstOrCreate(
                ['test_result_id' => $result->id, 'item_index' => $index],
                ['status' => $status],
            );
        }
    }

    /**
     * TC-007: passing result with a result-level custom value.
     */
    private function seedTc007Result(): void
    {
        $result = $this->seedSimpleResult('run-b', 'TC-007', 'passed', 15, 'tester2');

        TestResultCustomValue::firstOrCreate(
            ['test_result_id' => $result->id, 'custom_field_id' => $this->customFields['cf_notes']->id],
            ['value_text' => 'Load time measured at 1.4s on staging'],
        );
    }

    /**
     * Create watchers and polymorphic threaded comments.
     */
    private function seedWatchersAndComments(): void
    {
        $alpha = $this->projects['project-alpha'];
        $runA = $this->runs['run-a'];
        $tc001 = $this->testCases['TC-001'];

        /** @var list<array{user: string, type: string, id: int}> $watchers */
        $watchers = [
            ['user' => 'admin', 'type' => 'project', 'id' => $alpha->id],
            ['user' => 'lead1', 'type' => 'project', 'id' => $alpha->id],
            ['user' => 'tester1', 'type' => 'test_run', 'id' => $runA->id],
            ['user' => 'tester1', 'type' => 'test_case', 'id' => $tc001->id],
        ];

        foreach ($watchers as $watcher) {
            Watcher::firstOrCreate([
                'user_id' => $this->users[$watcher['user']]->id,
                'watchable_type' => $watcher['type'],
                'watchable_id' => $watcher['id'],
            ]);
        }

        $caseComment = Comment::firstOrCreate(
            [
                'commentable_type' => 'test_case',
                'commentable_id' => $tc001->id,
                'parent_id' => null,
                'user_id' => $this->users['lead1']->id,
                'body' => 'This case covers the primary happy path. Priority verified.',
            ],
        );

        Comment::firstOrCreate(
            [
                'commentable_type' => 'test_case',
                'commentable_id' => $tc001->id,
                'parent_id' => $caseComment->id,
                'user_id' => $this->users['tester1']->id,
                'body' => 'Steps 3 and 4 updated after env change.',
            ],
        );

        Comment::firstOrCreate(
            [
                'commentable_type' => 'test_run',
                'commentable_id' => $runA->id,
                'parent_id' => null,
                'user_id' => $this->users['admin']->id,
                'body' => 'Run started — all testers please complete assignments by EOD.',
            ],
        );
    }

    /**
     * Create a webhook with delivery logs.
     */
    private function seedWebhooks(): void
    {
        $webhook = Webhook::updateOrCreate(
            ['project_id' => $this->projects['project-alpha']->id, 'name' => 'CI Notify'],
            [
                'url' => 'https://hooks.example.com/ci',
                'events' => ['result_added', 'run_status_changed'],
                'secret' => 'webhook-secret-1',
                'is_active' => true,
                'created_by' => $this->users['admin']->id,
            ],
        );

        $this->firstOrForceCreate(
            WebhookDelivery::class,
            ['webhook_id' => $webhook->id, 'event' => 'result_added'],
            [
                'payload' => ['event' => 'result_added', 'status' => 'passed'],
                'response_status' => 200,
                'delivered_at' => now()->subHour(),
                'created_at' => now()->subHour(),
            ],
        );

        $this->firstOrForceCreate(
            WebhookDelivery::class,
            ['webhook_id' => $webhook->id, 'event' => 'run_status_changed'],
            [
                'payload' => ['event' => 'run_status_changed', 'is_completed' => false],
                'response_status' => 500,
                'delivered_at' => now()->subMinutes(30),
                'created_at' => now()->subMinutes(30),
            ],
        );
    }

    /**
     * Create a saved report and a dashboard with widgets.
     */
    private function seedReportsAndDashboards(): void
    {
        $alpha = $this->projects['project-alpha'];
        $runA = $this->runs['run-a'];

        SavedReport::updateOrCreate(
            ['user_id' => $this->users['admin']->id, 'name' => 'Auth Suite Summary'],
            [
                'project_id' => $alpha->id,
                'report_type' => 'run_summary',
                'filters' => ['run_ids' => [$runA->id]],
                'access_level' => 'project_team',
            ],
        );

        $dashboard = Dashboard::updateOrCreate(
            ['user_id' => $this->users['admin']->id, 'name' => 'Admin Overview'],
            ['is_default' => true],
        );

        DashboardWidget::firstOrCreate(
            ['dashboard_id' => $dashboard->id, 'title' => 'Open Runs'],
            [
                'widget_type' => 'counter',
                'config' => ['metric' => 'active_runs', 'project_id' => $alpha->id],
                'position_x' => 0,
                'position_y' => 0,
                'width' => 2,
                'height' => 1,
            ],
        );

        DashboardWidget::firstOrCreate(
            ['dashboard_id' => $dashboard->id, 'title' => 'Pass Rate'],
            [
                'widget_type' => 'chart',
                'config' => ['chart_type' => 'pie', 'run_id' => $runA->id],
                'position_x' => 2,
                'position_y' => 0,
                'width' => 4,
                'height' => 2,
            ],
        );
    }

    /**
     * Create project-level and instance-level integrations.
     */
    private function seedIntegrations(): void
    {
        Integration::updateOrCreate(
            ['project_id' => $this->projects['project-alpha']->id, 'integration_type' => 'github', 'name' => 'GitHub Issues'],
            [
                'config' => ['owner' => 'example', 'repo' => 'harp-tms-demo'],
                'is_active' => true,
                'created_by' => $this->users['admin']->id,
            ],
        );

        Integration::updateOrCreate(
            ['project_id' => null, 'integration_type' => 'jira', 'name' => 'Jira Cloud'],
            [
                'config' => ['base_url' => 'https://example.atlassian.net', 'project_key' => 'TMS'],
                'is_active' => false,
                'created_by' => $this->users['admin']->id,
            ],
        );
    }

    /**
     * Create representative audit log entries.
     */
    private function seedAuditLogs(): void
    {
        $alpha = $this->projects['project-alpha'];
        $req001 = $this->requirements['REQ-001'];
        $runA = $this->runs['run-a'];
        $failedResult = $this->results['tc001-failed'];

        /** @var list<array<string, mixed>> $entries */
        $entries = [
            [
                'user_id' => $this->users['admin']->id,
                'action' => 'created',
                'entity_type' => 'Project',
                'entity_id' => $alpha->id,
                'before' => null,
                'after' => ['name' => 'Project Alpha'],
            ],
            [
                'user_id' => $this->users['lead1']->id,
                'action' => 'created',
                'entity_type' => 'Requirement',
                'entity_id' => $req001->id,
                'before' => null,
                'after' => ['title' => 'User Login', 'status' => 'draft'],
            ],
            [
                'user_id' => $this->users['lead1']->id,
                'action' => 'updated',
                'entity_type' => 'Requirement',
                'entity_id' => $req001->id,
                'before' => ['status' => 'draft'],
                'after' => ['status' => 'approved'],
            ],
            [
                'user_id' => $this->users['tester1']->id,
                'action' => 'created',
                'entity_type' => 'TestResult',
                'entity_id' => $failedResult->id,
                'before' => null,
                'after' => ['status' => 'failed'],
            ],
            [
                'user_id' => $this->users['admin']->id,
                'action' => 'updated',
                'entity_type' => 'TestRun',
                'entity_id' => $runA->id,
                'before' => ['is_completed' => false],
                'after' => ['is_completed' => false],
            ],
        ];

        foreach ($entries as $entry) {
            $this->firstOrForceCreate(
                AuditLog::class,
                [
                    'user_id' => $entry['user_id'],
                    'action' => $entry['action'],
                    'entity_type' => $entry['entity_type'],
                    'entity_id' => $entry['entity_id'],
                ],
                [
                    'before' => $entry['before'],
                    'after' => $entry['after'],
                    'ip_address' => '127.0.0.1',
                    'created_at' => now(),
                ],
            );
        }
    }

    /**
     * Seed instance-wide settings.
     */
    private function seedInstanceSettings(): void
    {
        InstanceSetting::set('site_name', 'Harp TMS');
        InstanceSetting::set('site_url', 'http://localhost:8000');
        InstanceSetting::set('default_timezone', 'UTC');
        InstanceSetting::set('session_timeout', '120');
        InstanceSetting::set('ai_features_enabled', 'false');
        InstanceSetting::set('max_attachment_size_mb', '50');
    }
}
