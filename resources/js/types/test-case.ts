import type { Section } from './suite';

export const TEMPLATE_TEXT        = 1;
export const TEMPLATE_STEPS       = 2;
export const TEMPLATE_EXPLORATORY = 3;
export const TEMPLATE_BDD         = 4;
export const TEMPLATE_CHECKLIST   = 5;

export interface TestCaseStep {
    id: number;
    test_case_id: number;
    action: string;
    expected: string | null;
    display_order: number;
}

export interface ChecklistItem {
    label: string;
    is_optional: boolean;
}

export interface TestCase {
    id: number;
    suite_id: number;
    section_id: number | null;
    section?: Section;
    title: string;
    template: number;
    /** Stored as a free-form string (e.g. "functional", "regression") */
    type_id: string | null;
    priority_id: number | null;
    /** Human-readable estimate string returned by the server, e.g. "1h 30m" */
    estimate: string | null;
    references: string | null;
    preconditions: string | null;
    /** Body text for text / exploratory templates */
    body: string | null;
    /** Raw Gherkin text for the BDD template */
    bdd_scenario: string | null;
    /** Structured checklist items for the checklist template */
    checklist_items: ChecklistItem[] | null;
    steps?: TestCaseStep[];
    created_at: string;
    updated_at: string;
}