import type { Milestone } from './project';

export const TEST_STATUSES = ['untested', 'passed', 'failed', 'blocked', 'retest', 'skipped'] as const;
export type TestStatus = typeof TEST_STATUSES[number];

export interface TestResult {
    id: number;
    test_id: number;
    status: TestStatus;
    comment: string | null;
    elapsed: number | null;
    version: string | null;
    created_at: string;
    created_by?: { id: number; name: string } | null;
}

export interface TestInstance {
    id: number;
    run_id: number;
    case_id: number;
    status: TestStatus;
    case?: {
        id: number;
        title: string;
        template: number;
        priority: string | null;
        section_id: number | null;
        section?: { id: number; name: string } | null;
    };
    latest_result?: TestResult | null;
}

export interface TestRun {
    id: number;
    project_id: number;
    suite_id: number | null;
    milestone_id: number | null;
    plan_id: number | null;
    name: string;
    description: string | null;
    refs: string | null;
    include_all: boolean;
    is_completed: boolean;
    completed_at: string | null;
    assigned_to: number | null;
    created_by?: { id: number; name: string } | null;
    url: string | null;
    passed_count: number;
    failed_count: number;
    blocked_count: number;
    untested_count: number;
    retest_count: number;
    skipped_count: number;
    tests_count?: number;
    milestone?: Milestone | null;
    suite?: { id: number; name: string } | null;
    project?: { id: number; name: string; suite_mode: number };
    tests?: TestInstance[];
    created_at: string;
    updated_at: string;
}