export type MilestoneStatus = 'upcoming' | 'active' | 'completed';

export interface MilestoneChild {
    id: number;
    parent_id: number;
    name: string;
    status: MilestoneStatus;
    due_on: string | null;
    is_completed: boolean;
    test_runs_count?: number;
    test_plans_count?: number;
}

export interface Milestone {
    id: number;
    project_id: number;
    parent_id: number | null;
    name: string;
    description: string | null;
    refs: string | null;
    status: MilestoneStatus;
    start_on: string | null;
    due_on: string | null;
    completed_at: string | null;
    is_completed: boolean;
    created_by?: { id: number; name: string } | null;
    parent?: { id: number; name: string } | null;
    children?: MilestoneChild[];
    test_runs?: MilestoneTestRun[];
    test_runs_count?: number;
    test_plans_count?: number;
    project?: { id: number; name: string };
    created_at: string;
    updated_at: string;
}

/** Slim run shape used only inside milestone show page */
export interface MilestoneTestRun {
    id: number;
    milestone_id: number;
    name: string;
    is_completed: boolean;
    passed_count: number;
    failed_count: number;
    blocked_count: number;
    untested_count: number;
    retest_count: number;
    skipped_count: number;
}