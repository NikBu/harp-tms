<?php

namespace Database\Seeders;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\Section;
use App\Models\Suite;
use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestCaseStep;
use App\Models\TestPlan;
use App\Models\TestPlanEntry;
use App\Models\TestResult;
use App\Models\TestRun;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Fills Project Beta and Project Gamma with realistic test data:
 * sections, test cases across all templates, milestones, runs and results.
 *
 * Designed to run AFTER TechnicalSeeder. All lookups are by name so
 * the two seeders stay decoupled — no hard-coded IDs.
 */
class BetaGammaSeeder extends Seeder
{
    // ── resolved models ───────────────────────────────────────────────
    private array $users    = [];
    private array $projects = [];
    private array $suites   = [];
    private array $sections = [];
    private array $cases    = [];
    private array $miles    = [];
    private array $runs     = [];
    private array $tests    = [];

    public function run(): void
    {
        DB::transaction(function (): void {
            $this->loadSharedFixtures();
            $this->seedBeta();
            $this->seedGamma();
        });
    }

    // ──────────────────────────────────────────────────────────────────
    // Boot — resolve users & projects created by TechnicalSeeder
    // ──────────────────────────────────────────────────────────────────

    private function loadSharedFixtures(): void
    {
        $emails = [
            'admin'   => 'admin@harp.test',
            'lead1'   => 'lead1@harp.test',
            'lead2'   => 'lead2@harp.test',
            'tester1' => 'tester1@harp.test',
            'tester2' => 'tester2@harp.test',
            'tester3' => 'tester3@harp.test',
        ];
        foreach ($emails as $key => $email) {
            $this->users[$key] = User::where('email', $email)->firstOrFail();
        }

        foreach (['Project Beta', 'Project Gamma'] as $name) {
            $slug = strtolower(str_replace(' ', '-', $name));
            $this->projects[$slug] = Project::where('name', $name)->firstOrFail();
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // PROJECT BETA  (suite_mode = SINGLE_BASELINE)
    // Theme: mobile banking app — authentication, payments, notifications
    // ──────────────────────────────────────────────────────────────────

    private function seedBeta(): void
    {
        $beta  = $this->projects['project-beta'];
        $suite = Suite::where('project_id', $beta->id)->where('name', 'Baseline Suite')->firstOrFail();
        $this->suites['Baseline Suite'] = $suite;

        // ── Sections ──────────────────────────────────────────────────
        $auth  = $this->makeSection($suite, null,  'Authentication',  0, 0);
        $pay   = $this->makeSection($suite, null,  'Payments',        0, 1);
        $notif = $this->makeSection($suite, null,  'Notifications',   0, 2);
        $reg   = $this->makeSection($suite, $auth, 'Biometric Login', 1, 0);
        $pin   = $this->makeSection($suite, $auth, 'PIN Login',       1, 1);

        // ── Test Cases ─────────────────────────────────────────────────
        // Authentication — Biometric
        $this->makeCase($suite, $reg, 'BC-001 Face ID login success', 'steps', 'critical', 'approved', [
            ['content' => 'Enable Face ID in device settings', 'expected' => 'Face ID is active'],
            ['content' => 'Open app and trigger Face ID', 'expected' => 'Authentication dialog shown'],
            ['content' => 'Present registered face', 'expected' => 'User logged in, dashboard visible'],
        ]);
        $this->makeCase($suite, $reg, 'BC-002 Face ID fallback to PIN', 'steps', 'high', 'approved', [
            ['content' => 'Fail Face ID 3 times', 'expected' => 'PIN entry screen shown'],
            ['content' => 'Enter correct PIN', 'expected' => 'User logged in'],
        ]);
        $this->makeCase($suite, $reg, 'BC-003 Biometric not enrolled', 'text', 'medium', 'approved', [], [
            'expected_result' => 'App detects no biometric enrollment and falls back to PIN/password login gracefully.',
        ]);

        // Authentication — PIN
        $this->makeCase($suite, $pin, 'BC-004 PIN login success', 'steps', 'critical', 'approved', [
            ['content' => 'Enter correct 6-digit PIN', 'expected' => 'User logged in'],
        ]);
        $this->makeCase($suite, $pin, 'BC-005 PIN lockout after 5 failures', 'steps', 'critical', 'approved', [
            ['content' => 'Enter wrong PIN 5 times', 'expected' => 'Account locked, support message shown'],
        ]);
        $this->makeCase($suite, $pin, 'BC-006 PIN reset flow', 'steps', 'high', 'review', [
            ['content' => 'Request PIN reset via email', 'expected' => 'Reset link sent'],
            ['content' => 'Follow link and set new PIN', 'expected' => 'New PIN active'],
        ]);

        // Payments
        $this->makeCase($suite, $pay, 'BC-007 Send money to contact', 'steps', 'critical', 'approved', [
            ['content' => 'Open Payments tab', 'expected' => 'Contact list visible'],
            ['content' => 'Select recipient and amount', 'expected' => 'Confirmation screen shown'],
            ['content' => 'Confirm with PIN', 'expected' => 'Transfer initiated, receipt shown'],
        ]);
        $this->makeCase($suite, $pay, 'BC-008 Insufficient funds error', 'steps', 'high', 'approved', [
            ['content' => 'Attempt transfer exceeding balance', 'expected' => 'Insufficient funds error displayed'],
        ]);
        $this->makeCase($suite, $pay, 'BC-009 Payment BDD happy path', 'bdd', 'high', 'approved', [], [
            'bdd_scenario' => "Feature: Payments\n  Scenario: Successful transfer\n    Given I am logged in with sufficient funds\n    When I send 50 EUR to a registered contact\n    Then the transfer completes and my balance decreases by 50 EUR",
        ]);
        $this->makeCase($suite, $pay, 'BC-010 Payment release checklist', 'checklist', 'critical', 'approved', [], [
            'checklist_items' => [
                ['label' => 'Fraud detection rules active', 'is_optional' => false],
                ['label' => 'Daily limit enforced', 'is_optional' => false],
                ['label' => 'Transaction log persisted', 'is_optional' => false],
                ['label' => 'Push notification delivered', 'is_optional' => true],
            ],
        ]);

        // Notifications
        $this->makeCase($suite, $notif, 'BC-011 Push notification on transfer', 'steps', 'medium', 'approved', [
            ['content' => 'Trigger an outgoing transfer', 'expected' => 'Push notification received within 5 s'],
        ]);
        $this->makeCase($suite, $notif, 'BC-012 Email receipt on transfer', 'text', 'low', 'draft', [], [
            'expected_result' => 'User receives a correctly formatted email receipt within 2 minutes of a completed transfer.',
        ]);
        $this->makeCase($suite, $notif, 'BC-013 Notification preferences', 'steps', 'medium', 'review', [
            ['content' => 'Disable push notifications in profile', 'expected' => 'Setting saved'],
            ['content' => 'Trigger a transfer', 'expected' => 'No push notification sent'],
        ]);

        // ── Milestones ────────────────────────────────────────────────
        $today = Carbon::today();

        $v2 = Milestone::updateOrCreate(
            ['project_id' => $beta->id, 'parent_id' => null, 'name' => 'v2.0 Mobile Release'],
            [
                'status'     => 'active',
                'start_on'   => $today->toDateString(),
                'due_on'     => $today->copy()->addDays(45)->toDateString(),
                'created_by' => $this->users['lead1']->id,
            ],
        );
        $this->miles['v2.0 Mobile Release'] = $v2;

        $sprint1 = Milestone::updateOrCreate(
            ['project_id' => $beta->id, 'parent_id' => $v2->id, 'name' => 'Beta Sprint 1'],
            [
                'status'       => 'completed',
                'due_on'       => $today->copy()->subDays(5)->toDateString(),
                'is_completed' => true,
                'completed_at' => now()->subDays(5),
                'created_by'   => $this->users['lead1']->id,
            ],
        );
        $this->miles['Beta Sprint 1'] = $sprint1;

        $sprint2 = Milestone::updateOrCreate(
            ['project_id' => $beta->id, 'parent_id' => $v2->id, 'name' => 'Beta Sprint 2'],
            [
                'status'     => 'active',
                'due_on'     => $today->copy()->addDays(10)->toDateString(),
                'created_by' => $this->users['lead1']->id,
            ],
        );
        $this->miles['Beta Sprint 2'] = $sprint2;

        // ── Test Runs ─────────────────────────────────────────────────
        $plan = TestPlan::updateOrCreate(
            ['project_id' => $beta->id, 'name' => 'v2.0 Regression Plan'],
            [
                'milestone_id' => $v2->id,
                'created_by'   => $this->users['lead1']->id,
                'start_on'     => $today->toDateString(),
                'end_on'       => $today->copy()->addDays(14)->toDateString(),
            ],
        );

        $authRun = TestRun::updateOrCreate(
            ['project_id' => $beta->id, 'name' => 'Auth & PIN Run'],
            [
                'suite_id'     => $suite->id,
                'plan_id'      => $plan->id,
                'milestone_id' => $sprint2->id,
                'include_all'  => false,
                'created_by'   => $this->users['lead1']->id,
                'assigned_to'  => $this->users['tester1']->id,
            ],
        );
        $this->runs['auth-run'] = $authRun;
        $this->attachRunCases($authRun, ['BC-001', 'BC-002', 'BC-003', 'BC-004', 'BC-005']);

        $payRun = TestRun::updateOrCreate(
            ['project_id' => $beta->id, 'name' => 'Payments Run'],
            [
                'suite_id'     => $suite->id,
                'plan_id'      => $plan->id,
                'milestone_id' => $sprint2->id,
                'include_all'  => false,
                'created_by'   => $this->users['lead1']->id,
                'assigned_to'  => $this->users['tester3']->id,
            ],
        );
        $this->runs['pay-run'] = $payRun;
        $this->attachRunCases($payRun, ['BC-007', 'BC-008', 'BC-009', 'BC-010']);

        TestPlanEntry::updateOrCreate(
            ['plan_id' => $plan->id, 'run_id' => $authRun->id],
            ['assigned_to' => $this->users['tester1']->id],
        );
        TestPlanEntry::updateOrCreate(
            ['plan_id' => $plan->id, 'run_id' => $payRun->id],
            ['assigned_to' => $this->users['tester3']->id],
        );

        // ── Execution ─────────────────────────────────────────────────
        $this->makeTest('auth-run', 'BC-001', $this->users['tester1']->id);
        $this->makeTest('auth-run', 'BC-002', $this->users['tester1']->id);
        $this->makeTest('auth-run', 'BC-003', $this->users['tester1']->id);
        $this->makeTest('auth-run', 'BC-004', $this->users['tester1']->id);
        $this->makeTest('auth-run', 'BC-005', $this->users['tester1']->id);
        $this->makeTest('pay-run',  'BC-007', $this->users['tester3']->id);
        $this->makeTest('pay-run',  'BC-008', $this->users['tester3']->id);
        $this->makeTest('pay-run',  'BC-009', $this->users['tester3']->id);
        $this->makeTest('pay-run',  'BC-010', $this->users['tester3']->id);

        $this->addResult('auth-run', 'BC-001', 'passed',  90,  'tester1');
        $this->addResult('auth-run', 'BC-002', 'passed',  60,  'tester1');
        $this->addResult('auth-run', 'BC-003', 'passed',  40,  'tester1');
        $this->addResult('auth-run', 'BC-004', 'passed',  30,  'tester1');
        $this->addResult('auth-run', 'BC-005', 'failed',  45,  'tester1', 'Account not locking after 5th attempt — defect filed');
        $this->addResult('pay-run',  'BC-007', 'passed',  120, 'tester3');
        $this->addResult('pay-run',  'BC-008', 'passed',  55,  'tester3');
        $this->addResult('pay-run',  'BC-009', 'passed',  50,  'tester3');
        $this->addResult('pay-run',  'BC-010', 'blocked', null,'tester3', 'Fraud service unavailable in staging');

        $authRun->update(['passed_count' => 4, 'failed_count' => 1]);
        $payRun->update(['passed_count' => 3, 'blocked_count' => 1]);
    }

    // ──────────────────────────────────────────────────────────────────
    // PROJECT GAMMA  (suite_mode = MULTI)
    // Theme: e-commerce platform — frontend UI, backend API, performance
    // ──────────────────────────────────────────────────────────────────

    private function seedGamma(): void
    {
        $gamma   = $this->projects['project-gamma'];
        $frontend = Suite::where('project_id', $gamma->id)->where('name', 'Frontend Suite')->firstOrFail();
        $backend  = Suite::where('project_id', $gamma->id)->where('name', 'Backend Suite')->firstOrFail();
        $this->suites['Frontend Suite'] = $frontend;
        $this->suites['Backend Suite']  = $backend;

        // ── Frontend Sections ──────────────────────────────────────────
        $cart     = $this->makeSection($frontend, null, 'Cart & Checkout',   0, 0);
        $search   = $this->makeSection($frontend, null, 'Search & Filters',  0, 1);
        $pdp      = $this->makeSection($frontend, null, 'Product Detail',    0, 2);

        // ── Backend Sections ───────────────────────────────────────────
        $orders   = $this->makeSection($backend, null, 'Orders API',         0, 0);
        $catalog  = $this->makeSection($backend, null, 'Catalog API',        0, 1);
        $perf     = $this->makeSection($backend, null, 'Performance',        0, 2);

        // ── Frontend Test Cases ────────────────────────────────────────
        // Cart & Checkout
        $this->makeCase($frontend, $cart, 'GC-001 Add item to cart', 'steps', 'critical', 'approved', [
            ['content' => 'Open a product detail page', 'expected' => 'Add to Cart button visible'],
            ['content' => 'Click Add to Cart', 'expected' => 'Item count in header increments'],
            ['content' => 'Open cart drawer', 'expected' => 'Item listed with correct price and quantity'],
        ]);
        $this->makeCase($frontend, $cart, 'GC-002 Remove item from cart', 'steps', 'high', 'approved', [
            ['content' => 'Add 2 items to cart', 'expected' => 'Cart shows 2 items'],
            ['content' => 'Remove one item', 'expected' => 'Cart shows 1 item, total updated'],
        ]);
        $this->makeCase($frontend, $cart, 'GC-003 Guest checkout flow', 'steps', 'critical', 'approved', [
            ['content' => 'Proceed to checkout without logging in', 'expected' => 'Guest email field shown'],
            ['content' => 'Enter email and shipping details', 'expected' => 'Payment step visible'],
            ['content' => 'Complete payment', 'expected' => 'Order confirmation page shown'],
        ]);
        $this->makeCase($frontend, $cart, 'GC-004 Checkout BDD', 'bdd', 'critical', 'approved', [], [
            'bdd_scenario' => "Feature: Checkout\n  Scenario: Successful guest checkout\n    Given I have 1 item in my cart\n    When I complete the checkout as a guest\n    Then I receive an order confirmation email",
        ]);
        $this->makeCase($frontend, $cart, 'GC-005 Promo code application', 'steps', 'medium', 'review', [
            ['content' => 'Enter valid promo code', 'expected' => 'Discount applied to order total'],
            ['content' => 'Enter expired promo code', 'expected' => 'Error: code expired'],
        ]);

        // Search
        $this->makeCase($frontend, $search, 'GC-006 Search by keyword', 'steps', 'high', 'approved', [
            ['content' => 'Type keyword in search bar', 'expected' => 'Autocomplete suggestions shown'],
            ['content' => 'Press Enter', 'expected' => 'Results page with matching products'],
        ]);
        $this->makeCase($frontend, $search, 'GC-007 Filter by price range', 'steps', 'medium', 'approved', [
            ['content' => 'Apply min/max price filter', 'expected' => 'Only products within range shown'],
        ]);
        $this->makeCase($frontend, $search, 'GC-008 Zero results state', 'text', 'low', 'approved', [], [
            'expected_result' => 'Search with no matches displays a friendly empty state with suggestions.',
        ]);

        // Product Detail
        $this->makeCase($frontend, $pdp, 'GC-009 Image gallery navigation', 'steps', 'medium', 'approved', [
            ['content' => 'Click next on product image carousel', 'expected' => 'Next image shown'],
            ['content' => 'Click thumbnail', 'expected' => 'Main image updates to thumbnail'],
        ]);
        $this->makeCase($frontend, $pdp, 'GC-010 Out-of-stock display', 'text', 'high', 'approved', [], [
            'expected_result' => 'Out-of-stock products show a disabled Add to Cart button and stock status label.',
        ]);

        // ── Backend Test Cases ─────────────────────────────────────────
        // Orders API
        $this->makeCase($backend, $orders, 'GC-011 POST /orders success', 'steps', 'critical', 'approved', [
            ['content' => 'POST /api/orders with valid payload', 'expected' => '201 Created with order ID'],
            ['content' => 'Verify order in GET /api/orders/{id}', 'expected' => 'Order status: pending'],
        ]);
        $this->makeCase($backend, $orders, 'GC-012 POST /orders validation', 'steps', 'high', 'approved', [
            ['content' => 'POST with missing required fields', 'expected' => '422 Unprocessable with field errors'],
        ]);
        $this->makeCase($backend, $orders, 'GC-013 Order state machine', 'checklist', 'high', 'approved', [], [
            'checklist_items' => [
                ['label' => 'pending → confirmed transition valid', 'is_optional' => false],
                ['label' => 'confirmed → shipped transition valid', 'is_optional' => false],
                ['label' => 'shipped → delivered transition valid', 'is_optional' => false],
                ['label' => 'delivered → cancelled blocked', 'is_optional' => false],
            ],
        ]);

        // Catalog API
        $this->makeCase($backend, $catalog, 'GC-014 GET /products pagination', 'steps', 'medium', 'approved', [
            ['content' => 'GET /api/products?page=1&per_page=20', 'expected' => '200 OK, 20 items, pagination meta'],
            ['content' => 'GET /api/products?page=999', 'expected' => '200 OK, empty data array'],
        ]);
        $this->makeCase($backend, $catalog, 'GC-015 Product search endpoint', 'bdd', 'medium', 'approved', [], [
            'bdd_scenario' => "Feature: Catalog\n  Scenario: Search by keyword\n    Given the catalog has 50 products\n    When I GET /api/products?q=shoe\n    Then I receive only products matching 'shoe'",
        ]);

        // Performance
        $this->makeCase($backend, $perf, 'GC-016 Homepage load time SLA', 'text', 'critical', 'approved', [], [
            'expected_result' => 'Homepage LCP must be under 1.5 s on a simulated 4G connection with 100 concurrent users.',
        ]);
        $this->makeCase($backend, $perf, 'GC-017 Checkout API throughput', 'checklist', 'critical', 'approved', [], [
            'checklist_items' => [
                ['label' => 'Handles 200 req/s without errors', 'is_optional' => false],
                ['label' => 'P99 latency < 300 ms', 'is_optional' => false],
                ['label' => 'No memory leak over 10 min soak', 'is_optional' => false],
            ],
        ]);

        // ── Milestones ────────────────────────────────────────────────
        $today = Carbon::today();

        $q3Launch = Milestone::updateOrCreate(
            ['project_id' => $gamma->id, 'parent_id' => null, 'name' => 'Q3 Platform Launch'],
            [
                'status'     => 'active',
                'start_on'   => $today->toDateString(),
                'due_on'     => $today->copy()->addDays(60)->toDateString(),
                'created_by' => $this->users['lead2']->id,
            ],
        );
        $this->miles['Q3 Platform Launch'] = $q3Launch;

        $featureFreezeMs = Milestone::updateOrCreate(
            ['project_id' => $gamma->id, 'parent_id' => $q3Launch->id, 'name' => 'Feature Freeze'],
            [
                'status'       => 'completed',
                'due_on'       => $today->copy()->subDays(3)->toDateString(),
                'is_completed' => true,
                'completed_at' => now()->subDays(3),
                'created_by'   => $this->users['lead2']->id,
            ],
        );
        $this->miles['Feature Freeze'] = $featureFreezeMs;

        $regressionMs = Milestone::updateOrCreate(
            ['project_id' => $gamma->id, 'parent_id' => $q3Launch->id, 'name' => 'Regression Window'],
            [
                'status'     => 'active',
                'due_on'     => $today->copy()->addDays(14)->toDateString(),
                'created_by' => $this->users['lead2']->id,
            ],
        );
        $this->miles['Regression Window'] = $regressionMs;

        // ── Test Runs ─────────────────────────────────────────────────
        $frontendRun = TestRun::updateOrCreate(
            ['project_id' => $gamma->id, 'name' => 'Frontend Regression'],
            [
                'suite_id'     => $frontend->id,
                'milestone_id' => $regressionMs->id,
                'include_all'  => false,
                'created_by'   => $this->users['lead2']->id,
                'assigned_to'  => $this->users['tester2']->id,
            ],
        );
        $this->runs['fe-run'] = $frontendRun;
        $this->attachRunCases($frontendRun, ['GC-001', 'GC-002', 'GC-003', 'GC-004', 'GC-006', 'GC-007']);

        $backendRun = TestRun::updateOrCreate(
            ['project_id' => $gamma->id, 'name' => 'Backend API Run'],
            [
                'suite_id'     => $backend->id,
                'milestone_id' => $regressionMs->id,
                'include_all'  => false,
                'created_by'   => $this->users['lead2']->id,
                'assigned_to'  => $this->users['tester3']->id,
            ],
        );
        $this->runs['be-run'] = $backendRun;
        $this->attachRunCases($backendRun, ['GC-011', 'GC-012', 'GC-013', 'GC-014', 'GC-015']);

        $perfRun = TestRun::updateOrCreate(
            ['project_id' => $gamma->id, 'name' => 'Performance Smoke'],
            [
                'suite_id'    => $backend->id,
                'include_all' => false,
                'created_by'  => $this->users['admin']->id,
            ],
        );
        $this->runs['perf-run'] = $perfRun;
        $this->attachRunCases($perfRun, ['GC-016', 'GC-017']);

        // ── Execution ─────────────────────────────────────────────────
        $this->makeTest('fe-run', 'GC-001', $this->users['tester2']->id);
        $this->makeTest('fe-run', 'GC-002', $this->users['tester2']->id);
        $this->makeTest('fe-run', 'GC-003', $this->users['tester2']->id);
        $this->makeTest('fe-run', 'GC-004', $this->users['tester2']->id);
        $this->makeTest('fe-run', 'GC-006', $this->users['tester2']->id);
        $this->makeTest('fe-run', 'GC-007', $this->users['tester2']->id);
        $this->makeTest('be-run', 'GC-011', $this->users['tester3']->id);
        $this->makeTest('be-run', 'GC-012', $this->users['tester3']->id);
        $this->makeTest('be-run', 'GC-013', $this->users['tester3']->id);
        $this->makeTest('be-run', 'GC-014', $this->users['tester3']->id);
        $this->makeTest('be-run', 'GC-015', $this->users['tester3']->id);
        $this->makeTest('perf-run', 'GC-016', null);
        $this->makeTest('perf-run', 'GC-017', null);

        $this->addResult('fe-run', 'GC-001', 'passed',  70,   'tester2');
        $this->addResult('fe-run', 'GC-002', 'passed',  45,   'tester2');
        $this->addResult('fe-run', 'GC-003', 'failed',  200,  'tester2', 'Payment step crashes on Safari 17 — JS error in console');
        $this->addResult('fe-run', 'GC-004', 'passed',  90,   'tester2');
        $this->addResult('fe-run', 'GC-006', 'passed',  55,   'tester2');
        $this->addResult('fe-run', 'GC-007', 'passed',  40,   'tester2');
        $this->addResult('be-run', 'GC-011', 'passed',  80,   'tester3');
        $this->addResult('be-run', 'GC-012', 'passed',  35,   'tester3');
        $this->addResult('be-run', 'GC-013', 'passed',  60,   'tester3');
        $this->addResult('be-run', 'GC-014', 'passed',  50,   'tester3');
        $this->addResult('be-run', 'GC-015', 'blocked', null, 'tester3', 'Search index not deployed to staging yet');
        // perf-run tests left untested intentionally

        $frontendRun->update(['passed_count' => 5, 'failed_count' => 1]);
        $backendRun->update(['passed_count' => 4, 'blocked_count' => 1]);
        $perfRun->update(['untested_count' => 2]);
    }

    // ──────────────────────────────────────────────────────────────────
    // Shared helpers
    // ──────────────────────────────────────────────────────────────────

    private function makeSection(Suite $suite, ?Section $parent, string $name, int $depth, int $order): Section
    {
        return Section::firstOrCreate(
            ['suite_id' => $suite->id, 'parent_id' => $parent?->id, 'name' => $name],
            ['depth' => $depth, 'display_order' => $order],
        );
    }

    /**
     * @param list<array{content: string, expected: string}> $steps
     * @param array<string, mixed> $extra
     */
    private function makeCase(
        Suite   $suite,
        Section $section,
        string  $title,
        string  $template,
        string  $priority,
        string  $status,
        array   $steps = [],
        array   $extra = [],
    ): TestCase {
        // Code = first 6 chars of title ("BC-001" / "GC-001" etc.)
        $code = substr($title, 0, 6);

        $tc = TestCase::firstOrCreate(
            ['suite_id' => $suite->id, 'title' => $title],
            array_merge([
                'section_id' => $section->id,
                'template'   => $template,
                'priority'   => $priority,
                'status'     => $status,
                'created_by' => $this->users['lead1']->id,
                'updated_by' => $this->users['lead1']->id,
            ], $extra),
        );

        foreach ($steps as $i => $step) {
            TestCaseStep::firstOrCreate(
                ['test_case_id' => $tc->id, 'step_index' => $i],
                ['content' => $step['content'], 'expected' => $step['expected']],
            );
        }

        $this->cases[$code] = $tc;
        return $tc;
    }

    private function makeTest(string $runKey, string $caseCode, ?int $assignedTo): Test
    {
        $test = Test::firstOrCreate(
            [
                'run_id'  => $this->runs[$runKey]->id,
                'case_id' => $this->cases[$caseCode]->id,
            ],
            ['assigned_to' => $assignedTo, 'status' => 'untested'],
        );

        $this->tests[$runKey . '|' . $caseCode] = $test;
        return $test;
    }

    private function addResult(
        string  $runKey,
        string  $caseCode,
        string  $status,
        ?int    $elapsed,
        string  $userKey,
        ?string $comment = null,
    ): void {
        $test = $this->tests[$runKey . '|' . $caseCode];

        $result = TestResult::where('test_id', $test->id)
            ->where('status', $status)
            ->first();

        if (! $result) {
            $result = new TestResult();
            $result->forceFill([
                'test_id'    => $test->id,
                'run_id'     => $test->run_id,
                'case_id'    => $test->case_id,
                'status'     => $status,
                'elapsed'    => $elapsed,
                'comment'    => $comment,
                'created_by' => $this->users[$userKey]->id,
                'created_at' => now(),
            ])->save();
        }

        $test->update(['status' => $status]);
    }

    /** @param list<string> $caseCodes */
    private function attachRunCases(TestRun $run, array $caseCodes): void
    {
        foreach ($caseCodes as $code) {
            DB::table('test_run_cases')->updateOrInsert([
                'test_run_id'  => $run->id,
                'test_case_id' => $this->cases[$code]->id,
            ]);
        }
    }
}
