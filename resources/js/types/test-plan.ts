import type { Milestone } from './milestone';

export interface PlanConfiguration {
    id: number;
    name: string;
}

export interface PlanConfigGroup {
    id: number;
    name: string;
    configurations: PlanConfiguration[];
}

export interface PlanEntryRun {
    id: number;
    name: string;
    is_completed: boolean;
    suite_id: number | null;
    passed_count: number;
    failed_count: number;
    blocked_count: number;
    untested_count: number;
    retest_count: number;
    skipped_count: number;
}

export interface TestPlanEntry {
    id: number;
    plan_id: number;
    run_id: number;
    assigned_to: number | null;
    run?: PlanEntryRun;
    assigned_to_user?: { id: number; name: string } | null;
    configurations?: PlanConfiguration[];
    created_at: string;
    updated_at: string;
}

export interface TestPlan {
    id: number;
    project_id: number;
    milestone_id: number | null;
    name: string;
    description: string | null;
    refs: string | null;
    is_completed: boolean;
    completed_at: string | null;
    start_on: string | null;
    end_on: string | null;
    entries_count?: number;
    milestone?: Pick<Milestone, 'id' | 'name'> | null;
    created_by?: { id: number; name: string } | null;
    entries?: TestPlanEntry[];
    project?: { id: number; name: string };
    created_at: string;
    updated_at: string;
}