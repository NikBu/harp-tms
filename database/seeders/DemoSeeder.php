<?php

namespace Database\Seeders;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\Section;
use App\Models\Suite;
use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestCaseStep;
use App\Models\TestResult;
use App\Models\TestRun;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds a realistic, demo-ready dataset for the fictional "TimeWizard" project:
 * a single-page productivity app being tested inside Harp TMS. The data is built
 * for live presentations, so every suite, case, run and result reads like a real
 * QA effort. The seeder is idempotent — it wipes the prior TimeWizard project and
 * rebuilds it from scratch on every run.
 */
class DemoSeeder extends Seeder
{
    private const PROJECT_NAME = 'TimeWizard';

    /**
     * Users keyed by short slug (nikita, anna, dmitry, maria, alex).
     *
     * @var array<string, User>
     */
    private array $users = [];

    /**
     * Suites keyed by readable name.
     *
     * @var array<string, Suite>
     */
    private array $suites = [];

    /**
     * Sections keyed by "Suite > Name".
     *
     * @var array<string, Section>
     */
    private array $sections = [];

    /**
     * Milestones keyed by name.
     *
     * @var array<string, Milestone>
     */
    private array $milestones = [];

    /**
     * Requirements keyed by display_id (REQ-001, ...).
     *
     * @var array<string, Requirement>
     */
    private array $requirements = [];

    /**
     * Test cases keyed by spec code (C1..C49).
     *
     * @var array<string, TestCase>
     */
    private array $cases = [];

    /**
     * The TimeWizard project, available after seedProject().
     */
    private Project $project;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $this->cleanupExisting();
            $this->seedUsers();
            $this->seedProject();
            $this->seedMembers();
            $this->seedMilestones();
            $this->seedSuitesAndSections();
            $this->seedTestCases();
            $this->seedRequirements();
            $this->seedTestRuns();
        });

        $this->command->info('Demo seeder complete. Project: TimeWizard, 49 test cases, 4 runs.');
    }

    /**
     * Remove the prior TimeWizard project so the seed is fully idempotent.
     *
     * The project cascade reaches suites, cases, runs and tests, but
     * test_results use restrictOnDelete on their parent keys, so they must be
     * deleted explicitly first.
     */
    private function cleanupExisting(): void
    {
        $project = Project::where('name', self::PROJECT_NAME)->first();

        if ($project === null) {
            return;
        }

        $runIds = TestRun::where('project_id', $project->id)->pluck('id');

        if ($runIds->isNotEmpty()) {
            TestResult::whereIn('run_id', $runIds)->delete();
        }

        $project->delete();
    }

    /**
     * Create (or fetch) a record on an append-only model whose created_at is not
     * fillable. Matches on the given attributes and force-fills the rest so an
     * explicit created_at is honoured rather than silently dropped.
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
     * Create the five demo users and assign their global Spatie roles.
     *
     * The instance only ships admin/test-lead/tester/viewer roles, so the spec's
     * positions map onto those: the QA lead becomes test-lead, automation and
     * manual QA engineers become testers, the developer becomes a viewer.
     */
    private function seedUsers(): void
    {
        /** @var array<string, array{name: string, email: string, role: string}> $definitions */
        $definitions = [
            'nikita' => ['name' => 'Nikita Burkov', 'email' => 'nikita@harp.test', 'role' => 'admin'],
            'anna' => ['name' => 'Anna Sokolova', 'email' => 'anna@harp.test', 'role' => 'test-lead'],
            'dmitry' => ['name' => 'Dmitry Petrov', 'email' => 'dmitry@harp.test', 'role' => 'tester'],
            'maria' => ['name' => 'Maria Ivanova', 'email' => 'maria@harp.test', 'role' => 'tester'],
            'alex' => ['name' => 'Alex Chen', 'email' => 'alex@harp.test', 'role' => 'viewer'],
        ];

        foreach ($definitions as $key => $definition) {
            $user = User::firstOrCreate(
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
     * Create the multi-suite TimeWizard project.
     */
    private function seedProject(): void
    {
        $this->project = Project::create([
            'name' => self::PROJECT_NAME,
            'description' => 'A single-page browser productivity app featuring timers, checklists, a reward cabinet, and an AI companion (Archibald). Built with vanilla JS + CSS custom properties.',
            'suite_mode' => Project::SUITE_MULTI,
            'created_by' => $this->users['nikita']->id,
        ]);
    }

    /**
     * Attach all five users to the project with per-project roles.
     */
    private function seedMembers(): void
    {
        $this->project->members()->syncWithoutDetaching([
            $this->users['nikita']->id => ['role' => 'project_admin'],
            $this->users['anna']->id => ['role' => 'lead'],
            $this->users['dmitry']->id => ['role' => 'tester'],
            $this->users['maria']->id => ['role' => 'tester'],
            $this->users['alex']->id => ['role' => 'viewer'],
        ]);
    }

    /**
     * Create the four release milestones.
     */
    private function seedMilestones(): void
    {
        $today = Carbon::today();
        $lead = $this->users['nikita']->id;

        $this->milestones['v0.1'] = Milestone::create([
            'project_id' => $this->project->id,
            'name' => 'v0.1 — Core Timers',
            'status' => 'completed',
            'is_completed' => true,
            'completed_at' => $today->copy()->subWeeks(3),
            'due_on' => $today->copy()->subWeeks(3)->toDateString(),
            'created_by' => $lead,
        ]);

        $this->milestones['v0.2'] = Milestone::create([
            'project_id' => $this->project->id,
            'name' => 'v0.2 — Checklists & Points',
            'status' => 'completed',
            'is_completed' => true,
            'completed_at' => $today->copy()->subWeeks(2),
            'due_on' => $today->copy()->subWeeks(2)->toDateString(),
            'created_by' => $lead,
        ]);

        $this->milestones['v0.3'] = Milestone::create([
            'project_id' => $this->project->id,
            'name' => 'v0.3 — Companion & Themes',
            'status' => 'active',
            'due_on' => $today->copy()->addWeek()->toDateString(),
            'created_by' => $lead,
        ]);

        $this->milestones['v1.0'] = Milestone::create([
            'project_id' => $this->project->id,
            'name' => 'v1.0 — Release',
            'status' => 'upcoming',
            'due_on' => $today->copy()->addWeeks(5)->toDateString(),
            'created_by' => $lead,
        ]);
    }

    /**
     * Create the four suites and their nested sections.
     */
    private function seedSuitesAndSections(): void
    {
        $timer = $this->makeSuite('Timer Module', 'Test cases for timer creation, countdown, presets, repeat modes and alerts');
        $timerCreation = $this->makeSection($timer, null, 'Timer Creation', 0, 0);
        $this->makeSection($timer, $timerCreation, 'Preset Quick-Add', 1, 0);
        $this->makeSection($timer, null, 'Repeat Modes', 0, 1);
        $this->makeSection($timer, null, 'Alert Sounds', 0, 2);
        $this->makeSection($timer, null, 'Header Timer Widget', 0, 3);

        $checklist = $this->makeSuite('Checklist Module', 'Test cases for lists, tasks, subtasks, progress tracking and drag reorder');
        $this->makeSection($checklist, null, 'List Management', 0, 0);
        $taskOps = $this->makeSection($checklist, null, 'Task Operations', 0, 1);
        $this->makeSection($checklist, $taskOps, 'Subtasks', 1, 0);
        $this->makeSection($checklist, null, 'Progress & Points', 0, 2);
        $this->makeSection($checklist, null, 'Drag & Reorder', 0, 3);

        $companion = $this->makeSuite('Companion & Themes', 'Test cases for Archibald companion, theme switching, light/dark mode');
        $this->makeSection($companion, null, 'Archibald Companion', 0, 0);
        $this->makeSection($companion, null, 'Themes', 0, 1);

        $crosscutting = $this->makeSuite('Cross-cutting Concerns', 'Import/export, localStorage, Service Worker, PWA, accessibility');
        $this->makeSection($crosscutting, null, 'Import / Export', 0, 0);
        $this->makeSection($crosscutting, null, 'PWA & Service Worker', 0, 1);
        $this->makeSection($crosscutting, null, 'Accessibility', 0, 2);
    }

    /**
     * Create a suite and register it by name.
     */
    private function makeSuite(string $name, string $description): Suite
    {
        $suite = Suite::create([
            'project_id' => $this->project->id,
            'name' => $name,
            'description' => $description,
            'created_by' => $this->users['nikita']->id,
        ]);

        $this->suites[$name] = $suite;

        return $suite;
    }

    /**
     * Create a section and register it under "Suite > Name".
     */
    private function makeSection(Suite $suite, ?Section $parent, string $name, int $depth, int $order): Section
    {
        $section = Section::create([
            'suite_id' => $suite->id,
            'parent_id' => $parent?->id,
            'name' => $name,
            'depth' => $depth,
            'display_order' => $order,
        ]);

        $this->sections[$suite->name.' > '.$name] = $section;

        return $section;
    }

    /**
     * Create all 49 test cases across the four suites.
     */
    private function seedTestCases(): void
    {
        $this->seedTimerCases();
        $this->seedChecklistCases();
        $this->seedCompanionCases();
        $this->seedCrosscuttingCases();
    }

    /**
     * Suite 1 — Timer Module (C1..C16).
     */
    private function seedTimerCases(): void
    {
        $creation = 'Timer Module > Timer Creation';
        $presets = 'Timer Module > Preset Quick-Add';
        $repeat = 'Timer Module > Repeat Modes';
        $sounds = 'Timer Module > Alert Sounds';
        $widget = 'Timer Module > Header Timer Widget';

        $this->makeSteps('C1', $creation, 'Create a basic timer with custom name and duration', 'medium', 120, [
            ['Open the Timers tab', '"New Timer" button is visible'],
            ['Click "New Timer"', 'Timer configuration form appears with default 25:00'],
            ['Enter name "Focus Session" and set 45 minutes', 'Fields accept input'],
            ['Click Add', 'Timer "Focus Session" appears in the Active Timers list with 45:00 countdown'],
            ['Verify timer shows correct name and duration', '"Focus Session" / "45:00"'],
        ]);

        $this->makeSteps('C2', $creation, "Timer name defaults to 'My Timer' when left blank", 'low', 60, [
            ['Open add timer form', 'name field shows "My Timer"'],
            ['Clear name field, set 5 minutes', 'field is blank'],
            ['Click Add', 'Timer created with name "My Timer" (default applied)'],
        ]);

        $this->makeSteps('C3', $creation, 'Cannot create timer with zero duration', 'high', 60, [
            ['Open add timer form', null],
            ['Set hours=0, minutes=0, seconds=0', null],
            ['Click Add', 'Error toast "Set a duration first."'],
        ]);

        $this->makeSteps('C4', $creation, 'Timer countdown runs and reaches zero', 'critical', 300, [
            ['Create a timer with 0h 0m 5s duration', null],
            ['Click Start on the timer', 'Timer begins counting down'],
            ['Wait 5 seconds', 'Timer hits 00:00, alert sound plays, timer marked as done'],
        ]);

        $this->makeSteps('C5', $presets, 'Pomodoro preset creates 25-minute timer', 'medium', 60, [
            ['Click "🍅 Pomodoro — 25 min" in Quick Presets', 'Timer "Pomodoro" added with 25:00'],
        ]);

        $this->makeSteps('C6', $presets, 'Deep Work preset creates repeating 1-hour timer', 'medium', 90, [
            ['Click "🧠 Deep Work — 1 hr (repeat)"', 'Timer added with repeat mode "fixed"'],
            ['Verify repeat badge or indicator shows', 'Repeat icon/label visible'],
        ]);

        $this->makeSteps('C7', $presets, 'Random preset creates timer between 5 and 30 minutes', 'low', 60, [
            ['Click "🎲 Random — 5 to 30 min" several times', 'Each timer has different duration between 5:00 and 30:00'],
        ]);

        $this->makeSteps('C8', $repeat, 'Fixed repeat mode restarts timer after completion', 'high', 180, [
            ['Create timer with 5s duration, repeat mode "Repeat each period", count=0 (infinite)', null],
            ['Start timer, wait for completion', 'Timer immediately restarts'],
            ['Verify repeat counter increments', '"Reps: 1" or similar indicator'],
        ]);

        $this->makeText('C9', $repeat, 'Fibonacci repeat mode uses correct intervals', 'medium', 120,
            'Create a timer with Fibonacci repeat mode. Expected intervals in minutes: 1, 1, 2, 3, 5, 8, 13. Verify each successive alarm fires at the correct interval after the previous one.');

        $this->makeSteps('C10', $repeat, 'Custom sequence repeat parses comma-separated minutes', 'medium', 120, [
            ['Select Repeat Mode = "Custom sequence"', null],
            ['Enter "2, 5, 10" in sequence field', null],
            ['Create timer', 'Timer created successfully'],
            ['Verify first interval = 2 minutes', 'Timer starts at 2:00'],
        ]);

        $this->makeSteps('C11', $repeat, 'Random range repeat stays within bounds', 'low', 120, [
            ['Create timer with Random repeat, min=1 min, max=3 min', null],
            ['Let timer complete 5 times', 'Each new interval is between 1:00 and 3:00'],
        ]);

        $this->makeChecklist('C12', $sounds, 'Each built-in sound plays without error', 'medium', 180, [
            'Bell plays',
            'Harp plays',
            'Chime plays',
            'Drum plays',
            'Bounce plays',
            'Trombone plays',
            'Silent produces no audio',
        ]);

        $this->makeSteps('C13', $sounds, 'Custom sound upload accepts MP3 file', 'medium', 120, [
            ['Navigate to Sound Library section', null],
            ['Click upload zone or drag an MP3 file', 'File accepted, custom sound appears in list'],
            ['Create timer using custom sound', 'Custom sound selectable in dropdown'],
        ]);

        $this->makeSteps('C14', $sounds, 'Custom sound upload rejects non-audio file', 'low', 60, [
            ['Try to upload a .txt file', 'File rejected or not added to sound list'],
        ]);

        $this->makeSteps('C15', $widget, 'Active timer appears in header badge', 'high', 90, [
            ['Start a timer', 'Header badge becomes visible'],
            ['Verify badge shows current timer countdown', 'Time matches active timer'],
        ]);

        $this->makeSteps('C16', $widget, 'Header widget shows all running timers in dropdown', 'medium', 120, [
            ['Start 3 different timers', null],
            ['Click the header badge', 'Dropdown lists all 3 timers with their countdowns'],
        ]);
    }

    /**
     * Suite 2 — Checklist Module (C17..C32).
     */
    private function seedChecklistCases(): void
    {
        $lists = 'Checklist Module > List Management';
        $tasks = 'Checklist Module > Task Operations';
        $subtasks = 'Checklist Module > Subtasks';
        $progress = 'Checklist Module > Progress & Points';
        $reorder = 'Checklist Module > Drag & Reorder';

        $this->makeSteps('C17', $lists, 'Create a new checklist with name and icon', 'medium', 90, [
            ['Click "New" in the lists sidebar', 'New list modal appears'],
            ['Enter name "Work Tasks", select an icon', null],
            ['Click Create', 'List appears in sidebar, becomes active'],
        ]);

        $this->makeSteps('C18', $lists, 'Rename a list by clicking the pencil icon', 'low', 60, [
            ['Open a list, click the pencil icon next to the title', 'Inline edit input appears'],
            ['Type new name, press Enter', 'List renamed in sidebar and header'],
        ]);

        $this->makeSteps('C19', $lists, 'Duplicate list preserves all tasks and subtasks', 'medium', 90, [
            ['Create a list with 3 tasks, one with 2 subtasks', null],
            ['Click Duplicate in the list actions', 'New list "X (copy)" appears'],
            ['Verify it contains identical tasks and subtasks', 'All items present'],
        ]);

        $this->makeSteps('C20', $lists, 'Delete list removes it from sidebar', 'medium', 60, [
            ['Select a list, click Delete', 'Confirmation prompt'],
            ['Confirm', 'List removed, active list changes to another or shows empty state'],
        ]);

        $this->makeSteps('C21', $tasks, 'Add a task to a list', 'critical', 60, [
            ['Select a list, type a task name in the add-task input', null],
            ['Press Enter or click Add', 'Task appears in the list'],
        ]);

        $this->makeSteps('C22', $tasks, 'Complete a task awards its points', 'high', 90, [
            ['Add a task with 10 points', null],
            ['Click the checkbox', 'Task marked done, header points counter increases by 10'],
        ]);

        $this->makeSteps('C23', $tasks, 'Add a note to a task', 'low', 90, [
            ['Expand task options', 'Notes field visible'],
            ['Type a note', 'Note saved and displayed on task'],
        ]);

        $this->makeSteps('C24', $tasks, 'Collapse a parent task hides its subtasks', 'medium', 60, [
            ['Create a parent task with 2 subtasks', null],
            ['Click the collapse triangle', 'Subtasks hidden, indicator changes to filled triangle'],
        ]);

        $this->makeSteps('C25', $subtasks, 'Add subtask by pressing Tab in task input', 'high', 90, [
            ['Click in the task input field below a parent task', null],
            ['Press Tab', 'Indent level increases (depth 1)'],
            ['Type name, press Enter', 'Subtask created under parent'],
        ]);

        $this->makeSteps('C26', $subtasks, 'Maximum subtask depth is 2 levels', 'medium', 90, [
            ['Create task → subtask (depth 1) → sub-subtask (depth 2)', null],
            ['Try to add depth-3 item by pressing Tab in depth-2 input', 'No further indentation, stays at depth 2'],
        ]);

        $this->makeSteps('C27', $subtasks, 'Deleting parent task also removes its subtasks', 'high', 60, [
            ['Create a parent with 2 subtasks', null],
            ['Delete the parent', 'Both parent and subtasks removed'],
        ]);

        $this->makeSteps('C28', $progress, 'Progress bar reflects completed task ratio', 'medium', 90, [
            ['Create list with 4 tasks, complete 2', null],
            ['Check progress bar', 'Bar shows ~50%'],
        ]);

        $this->makeSteps('C29', $progress, 'Clear Done removes completed tasks', 'medium', 60, [
            ['Complete several tasks', null],
            ['Click "Clear done"', 'Completed tasks removed, progress stats update'],
        ]);

        $this->makeSteps('C30', $progress, 'Total points in header matches sum of completed task points', 'high', 90, [
            ['Complete tasks with known point values (e.g., 10 + 20 + 5 = 35)', null],
            ['Check header point badge', 'Shows "✼ 35 pts"'],
        ]);

        $this->makeSteps('C31', $reorder, 'Drag task to reorder within list', 'medium', 120, [
            ['Create 3 tasks: A, B, C', null],
            ['Drag C to the top position', 'Order is C, A, B'],
            ['Refresh page', 'Order preserved via localStorage'],
        ]);

        $this->makeSteps('C32', $reorder, 'Drag list to reorder in sidebar', 'low', 90, [
            ['Create 3 lists: Work, Home, Learning', null],
            ['Drag "Home" to first position', 'Home appears first in sidebar'],
        ]);
    }

    /**
     * Suite 3 — Companion & Themes (C33..C40).
     */
    private function seedCompanionCases(): void
    {
        $companion = 'Companion & Themes > Archibald Companion';
        $themes = 'Companion & Themes > Themes';

        $this->makeSteps('C33', $companion, 'Companion shows greeting quote on page load', 'medium', 60, [
            ['Load page with companion enabled', 'Archibald shows a greeting quote'],
        ]);

        $this->makeSteps('C34', $companion, 'Companion reacts to timer completion', 'medium', 120, [
            ['Enable companion, create a 5s timer', null],
            ['Start timer, wait for completion', "Archibald's mood changes, timer_done quote shown"],
        ]);

        $this->makeSteps('C35', $companion, 'Companion can be disabled via toggle', 'low', 60, [
            ['Uncheck "Enable companion"', 'Companion popup disappears, quotes stop'],
            ['Re-enable', 'Companion reappears with "restored" message'],
        ]);

        $this->makeSteps('C36', $companion, 'Owl can be petted to boost morale', 'low', 60, [
            ['Click/pet the Archibald owl image', 'Mood changes to "excited", pet quote displayed, Wisdom points increase'],
        ]);

        $this->makeText('C37', $companion, 'Companion shows idle quotes during inactivity', 'low', 180,
            'Leave the application idle for 2+ minutes without any timer or task interactions. Archibald should display idle quotes at intervals. Verify the quotes match the idle quote bank and that they appear on the floating popup.');

        $this->makeChecklist('C38', $themes, 'All 5 themes apply correctly without broken styles', 'medium', 180, [
            'Old Parchment applies',
            'Dark Sanctum applies',
            'Enchanted Forest applies',
            'Ember & Ash applies',
            'Arctic Scholar applies',
        ]);

        $this->makeSteps('C39', $themes, 'Light/dark mode toggle switches correctly', 'high', 60, [
            ['Click the moon/sun toggle in header', 'data-theme attribute switches, colors update'],
            ['Toggle back', 'Returns to previous mode'],
        ]);

        $this->makeSteps('C40', $themes, 'Theme preference persists across reload', 'medium', 90, [
            ['Select "Enchanted Forest" theme', null],
            ['Reload page', 'Enchanted Forest still active'],
        ]);
    }

    /**
     * Suite 4 — Cross-cutting Concerns (C41..C49).
     */
    private function seedCrosscuttingCases(): void
    {
        $importExport = 'Cross-cutting Concerns > Import / Export';
        $pwa = 'Cross-cutting Concerns > PWA & Service Worker';
        $a11y = 'Cross-cutting Concerns > Accessibility';

        $this->makeSteps('C41', $importExport, 'Export generates valid JSON file', 'high', 90, [
            ['Create timers, lists, and rewards, set a theme', null],
            ['Click Export (or Ctrl+S)', 'File downloaded named "timewizard-state-YYYY-MM-DD.json"'],
            ['Open the JSON file', 'Valid JSON with keys: version, exportedAt, timers, lists, settings'],
        ]);

        $this->makeSteps('C42', $importExport, 'Import restores complete application state', 'critical', 180, [
            ['Export current state to file', null],
            ['Clear everything (delete all timers and lists manually)', null],
            ['Import the exported file', 'Toast "State imported." All timers, lists, points, and theme restored exactly'],
        ]);

        $this->makeSteps('C43', $importExport, 'Import rejects malformed JSON', 'medium', 60, [
            ['Create a text file with content "not valid json"', null],
            ['Import it', 'Toast "Import failed: invalid file"'],
        ]);

        $this->makeSteps('C44', $importExport, 'Ctrl+S shortcut triggers export', 'low', 60, [
            ['Press Ctrl+S (or Cmd+S on Mac)', 'File download triggered, same as clicking Export button'],
        ]);

        $this->makeSteps('C45', $pwa, 'Service Worker registers successfully', 'high', 90, [
            ['Open DevTools → Application → Service Workers', null],
            ['Load the page', 'Service Worker registered and active for the domain'],
        ]);

        $this->makeSteps('C46', $pwa, 'App works offline after first load', 'high', 180, [
            ['Load app online, interact with timers and lists', null],
            ['Go offline in DevTools Network tab', null],
            ['Reload page', 'App loads fully from cache, timers and lists intact'],
        ]);

        $this->makeSteps('C47', $pwa, 'App installable as PWA on desktop', 'medium', 60, [
            ['Open Chrome on desktop', null],
            ['Check address bar for install icon', 'Install icon present'],
            ['Click install', 'App installs as standalone window'],
        ]);

        $this->makeText('C48', $a11y, 'All interactive elements are keyboard-navigable', 'medium', 300,
            'Navigate the entire application using only Tab, Shift+Tab, Enter, Space and arrow keys. All buttons, checkboxes, inputs, and dropdowns should be reachable and operable without a mouse. Pay special attention to: timer controls, checklist task add form, theme switcher, modal dialogs.');

        $this->makeText('C49', $a11y, 'ARIA labels present on icon-only buttons', 'low', 120,
            'Inspect the DOM for icon-only buttons (export, import, theme toggle). Each should have aria-label or title attribute. Verify with screen reader (NVDA/JAWS/VoiceOver) that the button purpose is announced correctly.');
    }

    /**
     * Create a steps-template case with its ordered steps. Steps are provided as
     * [action, expected] pairs; expected may be null for intermediate steps.
     *
     * @param  list<array{0: string, 1: ?string}>  $steps
     */
    private function makeSteps(string $code, string $sectionKey, string $title, string $priority, int $estimate, array $steps): TestCase
    {
        $case = $this->makeCase($code, $sectionKey, $title, 'steps', $priority, $estimate);

        foreach ($steps as $index => $step) {
            TestCaseStep::create([
                'test_case_id' => $case->id,
                'step_index' => $index + 1,
                'content' => $step[0],
                'expected' => $step[1],
            ]);
        }

        return $case;
    }

    /**
     * Create a text-template case whose body lives in expected_result.
     */
    private function makeText(string $code, string $sectionKey, string $title, string $priority, int $estimate, string $body): TestCase
    {
        return $this->makeCase($code, $sectionKey, $title, 'text', $priority, $estimate, [
            'expected_result' => $body,
        ]);
    }

    /**
     * Create a checklist-template case from a flat list of item labels.
     *
     * @param  list<string>  $labels
     */
    private function makeChecklist(string $code, string $sectionKey, string $title, string $priority, int $estimate, array $labels): TestCase
    {
        $items = array_map(
            static fn (string $label): array => ['label' => $label, 'is_optional' => false],
            $labels,
        );

        return $this->makeCase($code, $sectionKey, $title, 'checklist', $priority, $estimate, [
            'checklist_items' => $items,
        ]);
    }

    /**
     * Create a single approved test case in the given section and register it.
     *
     * @param  array<string, mixed>  $extra
     */
    private function makeCase(string $code, string $sectionKey, string $title, string $template, string $priority, int $estimate, array $extra = []): TestCase
    {
        $section = $this->sections[$sectionKey];

        $case = TestCase::create(array_merge([
            'suite_id' => $section->suite_id,
            'section_id' => $section->id,
            'title' => $title,
            'template' => $template,
            'priority' => $priority,
            'estimate' => $estimate,
            'status' => 'approved',
            'created_by' => $this->users['nikita']->id,
            'updated_by' => $this->users['nikita']->id,
        ], $extra));

        $this->cases[$code] = $case;

        return $case;
    }

    /**
     * Create requirements and link them to their covering test cases.
     */
    private function seedRequirements(): void
    {
        /** @var list<array{display_id: string, title: string, type: string, priority: string, status: string, cases: list<string>}> $definitions */
        $definitions = [
            ['display_id' => 'REQ-001', 'title' => 'Timer duration must be a positive integer number of seconds', 'type' => 'functional', 'priority' => 'high', 'status' => 'approved', 'cases' => ['C1', 'C3']],
            ['display_id' => 'REQ-002', 'title' => 'Preset timers must create with predefined configurations', 'type' => 'functional', 'priority' => 'medium', 'status' => 'approved', 'cases' => ['C5', 'C6', 'C7']],
            ['display_id' => 'REQ-003', 'title' => 'Repeat modes must restart the timer per defined schedule', 'type' => 'functional', 'priority' => 'high', 'status' => 'approved', 'cases' => ['C8', 'C9', 'C10', 'C11']],
            ['display_id' => 'REQ-004', 'title' => 'Alert sounds must play at timer completion', 'type' => 'functional', 'priority' => 'high', 'status' => 'approved', 'cases' => ['C12', 'C13']],
            ['display_id' => 'REQ-005', 'title' => 'Checklist items must support up to 2 levels of nesting', 'type' => 'functional', 'priority' => 'medium', 'status' => 'approved', 'cases' => ['C25', 'C26']],
            ['display_id' => 'REQ-006', 'title' => 'Application state must be exportable and importable via JSON', 'type' => 'functional', 'priority' => 'critical', 'status' => 'approved', 'cases' => ['C41', 'C42', 'C43']],
            ['display_id' => 'REQ-007', 'title' => 'App must function offline via Service Worker cache', 'type' => 'non_functional', 'priority' => 'high', 'status' => 'under_review', 'cases' => ['C45', 'C46']],
            ['display_id' => 'REQ-008', 'title' => 'All interactive controls must be keyboard-accessible', 'type' => 'non_functional', 'priority' => 'medium', 'status' => 'draft', 'cases' => ['C48']],
        ];

        foreach ($definitions as $definition) {
            $requirement = Requirement::create([
                'project_id' => $this->project->id,
                'display_id' => $definition['display_id'],
                'title' => $definition['title'],
                'type' => $definition['type'],
                'priority' => $definition['priority'],
                'status' => $definition['status'],
                'source' => 'manual',
                'created_by' => $this->users['anna']->id,
                'updated_by' => $this->users['anna']->id,
            ]);

            $this->requirements[$definition['display_id']] = $requirement;

            foreach ($definition['cases'] as $caseCode) {
                DB::table('requirement_test_case')->insert([
                    'requirement_id' => $requirement->id,
                    'test_case_id' => $this->cases[$caseCode]->id,
                    'created_by' => $this->users['anna']->id,
                    'created_at' => now(),
                ]);
            }
        }
    }

    /**
     * Create the four execution runs with their tests and results.
     */
    private function seedTestRuns(): void
    {
        $this->seedRun1();
        $this->seedRun2();
        $this->seedRun3();
        $this->seedRun4();
    }

    /**
     * Run 1: v0.1 Sprint — Timer Module Smoke (completed).
     */
    private function seedRun1(): void
    {
        $run = $this->makeRun('v0.1 Sprint — Timer Module Smoke', 'Timer Module', 'v0.1', $this->users['anna']->id, true, Carbon::today()->subWeeks(3));

        /** @var list<array{0: string, 1: string, 2: string, 3: ?int, 4: array<string, mixed>}> $results */
        $results = [
            ['C1', 'passed', 'anna', 115, ['version' => '0.1.0']],
            ['C2', 'passed', 'anna', 55, []],
            ['C3', 'passed', 'anna', 50, []],
            ['C4', 'passed', 'anna', 290, []],
            ['C5', 'passed', 'anna', 55, []],
            ['C6', 'passed', 'dmitry', 80, []],
            ['C7', 'passed', 'dmitry', 55, []],
            ['C8', 'passed', 'dmitry', 170, []],
            ['C9', 'failed', 'dmitry', 110, ['comment' => 'Fibonacci intervals incorrect after 5th iteration — fires at 9 min instead of 8.', 'defect_url' => 'https://github.com/NikBu/time-wizard/issues/1']],
            ['C10', 'passed', 'anna', 115, []],
            ['C11', 'passed', 'anna', 110, []],
            ['C12', 'passed', 'anna', 175, []],
            ['C13', 'passed', 'dmitry', 110, []],
            ['C14', 'passed', 'dmitry', 55, []],
            ['C15', 'passed', 'anna', 85, []],
            ['C16', 'passed', 'anna', 115, []],
        ];

        $this->applyResults($run, $results);
        $this->finalizeRun($run, true);
    }

    /**
     * Run 2: v0.2 Sprint — Checklist Module (completed).
     */
    private function seedRun2(): void
    {
        $run = $this->makeRun('v0.2 Sprint — Checklist Module', 'Checklist Module', 'v0.2', $this->users['maria']->id, true, Carbon::today()->subWeeks(2));

        /** @var list<array{0: string, 1: string, 2: string, 3: ?int, 4: array<string, mixed>}> $results */
        $results = [
            ['C17', 'passed', 'maria', 85, ['version' => '0.2.0']],
            ['C18', 'passed', 'maria', 55, []],
            ['C19', 'passed', 'maria', 85, []],
            ['C20', 'passed', 'maria', 55, []],
            ['C21', 'passed', 'maria', 55, []],
            ['C22', 'passed', 'maria', 85, []],
            ['C23', 'passed', 'maria', 85, []],
            ['C24', 'failed', 'maria', 55, ['comment' => 'Triangle indicator does not change appearance when collapsed — both states look identical.', 'defect_url' => 'https://github.com/NikBu/time-wizard/issues/2']],
            ['C25', 'passed', 'dmitry', 85, []],
            ['C26', 'passed', 'dmitry', 85, []],
            ['C27', 'passed', 'dmitry', 55, []],
            ['C28', 'passed', 'maria', 85, []],
            ['C29', 'passed', 'maria', 55, []],
            ['C30', 'passed', 'maria', 85, []],
            ['C31', 'failed', 'dmitry', 115, ['comment' => 'After drag reorder, localStorage state not updated — refresh reverts order.', 'defect_url' => 'https://github.com/NikBu/time-wizard/issues/3']],
            ['C32', 'passed', 'dmitry', 85, []],
        ];

        $this->applyResults($run, $results);
        $this->finalizeRun($run, true);
    }

    /**
     * Run 3: v0.3 Sprint — Companion & Themes (open, partially executed).
     */
    private function seedRun3(): void
    {
        $run = $this->makeRun('v0.3 Sprint — Companion & Themes', 'Companion & Themes', 'v0.3', $this->users['anna']->id, false, null);

        /** @var list<array{0: string, 1: string, 2: string, 3: ?int, 4: array<string, mixed>}> $results */
        $results = [
            ['C33', 'passed', 'anna', 55, ['version' => '0.3.0-beta']],
            ['C34', 'passed', 'anna', 115, []],
            ['C35', 'passed', 'anna', 55, []],
            ['C36', 'retest', 'anna', 55, ['comment' => 'Wisdom points counter not visible in current UI — cannot verify increase.']],
            ['C38', 'passed', 'anna', 170, []],
            ['C39', 'failed', 'dmitry', 55, ['comment' => 'Dark mode toggle does not update the header background — stays light.', 'defect_url' => 'https://github.com/NikBu/time-wizard/issues/4']],
        ];

        $this->applyResults($run, $results);
        // C37 and C40 intentionally remain untested (no result recorded).
        $this->finalizeRun($run, false);
    }

    /**
     * Run 4: Regression — Import/Export (open, export cases executed only).
     */
    private function seedRun4(): void
    {
        $run = $this->makeRun('Regression — Import/Export', 'Cross-cutting Concerns', null, $this->users['maria']->id, false, null);

        /** @var list<array{0: string, 1: string, 2: string, 3: ?int, 4: array<string, mixed>}> $results */
        $results = [
            ['C41', 'passed', 'maria', 85, ['version' => '0.3.0-beta']],
            ['C42', 'passed', 'maria', 170, []],
            ['C43', 'passed', 'maria', 55, []],
            ['C44', 'passed', 'maria', 55, []],
        ];

        $this->applyResults($run, $results);
        // C45–C49 intentionally remain untested (PWA/A11y not yet run).
        $this->finalizeRun($run, false);
    }

    /**
     * Create a run scoped to a suite, with the full case list materialized as
     * untested Test rows so unexecuted cases surface in the run.
     */
    private function makeRun(string $name, string $suiteName, ?string $milestoneKey, int $assignedTo, bool $isCompleted, ?Carbon $completedAt): TestRun
    {
        $suite = $this->suites[$suiteName];

        $run = TestRun::create([
            'project_id' => $this->project->id,
            'suite_id' => $suite->id,
            'milestone_id' => $milestoneKey !== null ? $this->milestones[$milestoneKey]->id : null,
            'name' => $name,
            'include_all' => true,
            'is_completed' => $isCompleted,
            'completed_at' => $completedAt,
            'created_by' => $this->users['nikita']->id,
            'assigned_to' => $assignedTo,
        ]);

        $cases = TestCase::where('suite_id', $suite->id)->orderBy('id')->get();

        foreach ($cases as $case) {
            Test::create([
                'run_id' => $run->id,
                'case_id' => $case->id,
                'assigned_to' => $assignedTo,
                'status' => 'untested',
            ]);
        }

        return $run;
    }

    /**
     * Persist a batch of immutable results for a run and roll each test's status
     * up to its latest result.
     *
     * @param  list<array{0: string, 1: string, 2: string, 3: ?int, 4: array<string, mixed>}>  $results
     */
    private function applyResults(TestRun $run, array $results): void
    {
        foreach ($results as $row) {
            [$caseCode, $status, $userKey, $elapsed, $extra] = $row;

            $test = Test::where('run_id', $run->id)
                ->where('case_id', $this->cases[$caseCode]->id)
                ->firstOrFail();

            $this->firstOrForceCreate(
                TestResult::class,
                ['test_id' => $test->id, 'status' => $status],
                array_merge([
                    'run_id' => $run->id,
                    'case_id' => $test->case_id,
                    'elapsed' => $elapsed,
                    'created_by' => $this->users[$userKey]->id,
                    'assigned_to' => $run->assigned_to,
                    'created_at' => now(),
                ], $extra),
            );

            $test->update(['status' => $status]);
        }
    }

    /**
     * Recalculate a run's status counters from its tests and mark completion.
     */
    private function finalizeRun(TestRun $run, bool $isCompleted): void
    {
        /** @var Collection<string, int> $counts */
        $counts = Test::where('run_id', $run->id)
            ->selectRaw('status, count(*) as cnt')
            ->groupBy('status')
            ->pluck('cnt', 'status');

        $run->update([
            'passed_count' => $counts['passed'] ?? 0,
            'failed_count' => $counts['failed'] ?? 0,
            'blocked_count' => $counts['blocked'] ?? 0,
            'untested_count' => $counts['untested'] ?? 0,
            'retest_count' => $counts['retest'] ?? 0,
            'skipped_count' => $counts['skipped'] ?? 0,
            'is_completed' => $isCompleted,
        ]);
    }
}
