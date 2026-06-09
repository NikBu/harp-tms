import type { PaginationLink } from './project';

export interface Suite {
    id: number;
    project_id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface Section {
    id: number;
    suite_id: number;
    parent_id: number | null;
    name: string;
    description: string | null;
    position?: number;
    children?: Section[];
    testCases?: SuiteCase[];
    created_at?: string;
    updated_at?: string;
}

export interface SuiteCase {
    id: number;
    suite_id: number;
    section_id: number | null;
    title: string;
    template: number;
    type_id: string | null;
    priority_id: number | null;
    estimate: number | null;
    references: string | null;
    has_requirements: boolean;
    assigned_to_id: number | null;
    assignee_name: string | null;
}

export type PaginatedData<T> = {
    data: T[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
};
