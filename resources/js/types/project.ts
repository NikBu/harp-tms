import type { User } from './auth';

export type SuiteMode = 1 | 2 | 3;

export type ProjectRole = 'viewer' | 'tester' | 'author' | 'lead' | 'project_admin';

export type ProjectMember = Pick<User, 'id' | 'name' | 'email'> & {
    pivot: {
        role: ProjectRole;
    };
};

export type Milestone = {
    id: number;
    name: string;
    status: string;
    due_on: string | null;
    is_completed: boolean;
};

export type Project = {
    id: number;
    name: string;
    description: string | null;
    announcement: string | null;
    show_announcement: boolean;
    suite_mode: SuiteMode;
    is_completed: boolean;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    created_by?: Pick<User, 'id' | 'name'> | null;
    members?: ProjectMember[];
    members_count?: number;
    milestones?: Milestone[];
    test_cases_count?: number;
    test_runs_count?: number;
    requirements_count?: number;
    suites_count?: number;
    milestones_count?: number;
};

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type PaginatedProjects = {
    data: Project[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
};