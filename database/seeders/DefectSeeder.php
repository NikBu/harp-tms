<?php

namespace Database\Seeders;

use App\Models\DefectLink;
use App\Models\Project;
use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestResult;
use App\Models\TestRun;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds a variety of defect links into Project Alpha's existing test runs.
 *
 * Safe to run multiple times (idempotent via firstOrNew / forceFill).
 * Depends on TechnicalSeeder having already run (needs existing runs, tests, users).
 */
class DefectSeeder extends Seeder
{
    public function run(): void
    {
        $project = Project::where('name', 'Project Alpha')->firstOrFail();
        $tester1 = User::where('email', 'tester1@harp.test')->firstOrFail();
        $tester2 = User::where('email', 'tester2@harp.test')->firstOrFail();
        $lead    = User::where('email', 'lead1@harp.test')->firstOrFail();

        $runA = TestRun::where('project_id', $project->id)->where('name', 'Auth Suite Run')->firstOrFail();
        $runB = TestRun::where('project_id', $project->id)->where('name', 'Dashboard Run')->firstOrFail();

        // ----------------------------------------------------------------
        // 1. GitHub issue on TC-002 (invalid login) — open
        // ----------------------------------------------------------------
        $result1 = $this->getOrCreateFailedResult(
            $runA, 'TC-002', $tester1,
            'Error message not shown after 3 failed attempts', 45,
        );
        $this->createDefectLink(
            result: $result1,
            trackerType: 'github',
            externalId: '201',
            externalUrl: 'https://github.com/example/repo/issues/201',
            title: 'Error message missing after brute-force login attempts',
            status: 'open',
            createdBy: $tester1->id,
            createdAt: now()->subDays(3),
        );

        // ----------------------------------------------------------------
        // 2. Jira ticket on TC-003 (registration blocked) — in_progress
        // ----------------------------------------------------------------
        $result2 = $this->getOrCreateFailedResult(
            $runA, 'TC-003', $tester1,
            'POST /api/register returns 500 — DB constraint violation', 30,
        );
        $this->createDefectLink(
            result: $result2,
            trackerType: 'jira',
            externalId: 'TMS-88',
            externalUrl: 'https://example.atlassian.net/browse/TMS-88',
            title: 'Registration endpoint crashes with unique constraint error',
            status: 'in_progress',
            createdBy: $tester1->id,
            createdAt: now()->subDays(2),
        );

        // ----------------------------------------------------------------
        // 3. GitHub issue on TC-007 (dashboard SLA) — open, linked by lead
        // ----------------------------------------------------------------
        $result3 = $this->getOrCreateFailedResult(
            $runB, 'TC-007', $tester2,
            'Dashboard load time 4.2s, exceeds 2s SLA threshold', 240,
        );
        $this->createDefectLink(
            result: $result3,
            trackerType: 'github',
            externalId: '215',
            externalUrl: 'https://github.com/example/repo/issues/215',
            title: 'Dashboard load time exceeds SLA (4.2s measured)',
            status: 'open',
            createdBy: $lead->id,
            createdAt: now()->subDay(),
        );

        // ----------------------------------------------------------------
        // 4. Linear ticket on TC-005 (BDD login) — resolved
        // ----------------------------------------------------------------
        $result4 = $this->getOrCreateFailedResult(
            $runA, 'TC-005', $tester1,
            'BDD step "Then I should be redirected" fails — cookie not set', 80,
        );
        $this->createDefectLink(
            result: $result4,
            trackerType: 'linear',
            externalId: 'ENG-344',
            externalUrl: 'https://linear.app/example/issue/ENG-344',
            title: 'Session cookie not set on successful BDD login scenario',
            status: 'resolved',
            createdBy: $tester1->id,
            createdAt: now()->subDays(5),
        );

        // ----------------------------------------------------------------
        // 5. YouTrack ticket on TC-006 (deployment checklist) — open
        // ----------------------------------------------------------------
        $result5 = $this->getOrCreateFailedResult(
            $runB, 'TC-006', $tester2,
            'Queue workers step fails — supervisor not installed on staging', 15,
        );
        $this->createDefectLink(
            result: $result5,
            trackerType: 'youtrack',
            externalId: 'HARP-56',
            externalUrl: 'https://youtrack.example.com/issue/HARP-56',
            title: 'Supervisor not configured on staging; queue workers do not restart',
            status: 'open',
            createdBy: $tester2->id,
            createdAt: now()->subHours(6),
        );
    }

    /**
     * Look up a Test by run + case title prefix, then get-or-create a failed result.
     */
    private function getOrCreateFailedResult(
        TestRun $run,
        string $caseTitlePrefix,
        User $user,
        string $comment,
        int $elapsed,
    ): TestResult {
        $testCase = TestCase::withTrashed()
            ->where('title', 'like', $caseTitlePrefix.'%')
            ->firstOrFail();

        $test = Test::where('run_id', $run->id)
            ->where('case_id', $testCase->id)
            ->firstOrFail();

        /** @var TestResult $result */
        $result = TestResult::firstOrNew([
            'test_id' => $test->id,
            'status'  => 'failed',
        ]);

        if (! $result->exists) {
            $result->forceFill([
                'test_id'    => $test->id,
                'run_id'     => $run->id,
                'case_id'    => $test->case_id,
                'status'     => 'failed',
                'comment'    => $comment,
                'elapsed'    => $elapsed,
                'created_by' => $user->id,
                'created_at' => now(),
            ])->save();
        }

        return $result;
    }

    /**
     * Idempotent defect link creation — skips if (result, tracker, external_id) already exists.
     *
     * @param \DateTimeInterface $createdAt  Accepts both Carbon and CarbonImmutable (Laravel 11+)
     */
    private function createDefectLink(
        TestResult $result,
        string $trackerType,
        string $externalId,
        string $externalUrl,
        string $title,
        string $status,
        int $createdBy,
        \DateTimeInterface $createdAt,
    ): DefectLink {
        /** @var DefectLink $link */
        $link = DefectLink::firstOrNew([
            'test_result_id' => $result->id,
            'tracker_type'   => $trackerType,
            'external_id'    => $externalId,
        ]);

        if (! $link->exists) {
            $link->forceFill([
                'test_result_id' => $result->id,
                'tracker_type'   => $trackerType,
                'external_id'    => $externalId,
                'external_url'   => $externalUrl,
                'title'          => $title,
                'status'         => $status,
                'created_by'     => $createdBy,
                'created_at'     => $createdAt,
            ])->save();
        }

        return $link;
    }
}
