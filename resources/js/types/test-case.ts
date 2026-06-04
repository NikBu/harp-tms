import type { Section } from './suite';

export const TEMPLATE_TEXT = 1;
export const TEMPLATE_STEPS = 2;
export const TEMPLATE_EXPLORATORY = 3;
export const TEMPLATE_BDD = 4;
export const TEMPLATE_CHECKLIST = 5;

export interface TestCaseStep {
    id: number;
    test_case_id: number;
    action: string;
    expected: string | null;
    display_order: number;
}

export interface TestCase {
    id: number;
    suite_id: number;
    section_id: number | null;
    section?: Section;
    title: string;
    template: number;
    type_id: number | null;
    priority_id: number | null;
    estimate: string | null;
    references: string | null;
    preconditions: string | null;
    body: string | null;
    steps?: TestCaseStep[];
    created_at: string;
    updated_at: string;
}
