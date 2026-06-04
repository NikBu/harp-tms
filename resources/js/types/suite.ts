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
    position: number;
    children?: Section[];
    created_at: string;
    updated_at: string;
}

export type PaginatedData<T> = {
    data: T[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
};
