export type RequirementType =
    | 'functional'
    | 'non_functional'
    | 'business'
    | 'constraint'
    | 'user_story';

export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';

export type RequirementStatus = 'draft' | 'under_review' | 'approved' | 'obsolete';

export interface RequirementFolder {
    id: number;
    project_id: number;
    parent_id: number | null;
    name: string;
    display_order: number;
    children?: RequirementFolder[];
    requirements?: Requirement[];
}

export interface Requirement {
    id: number;
    project_id: number;
    folder_id: number | null;
    display_id: string;
    title: string;
    description: string | null;
    type: RequirementType | null;
    priority: RequirementPriority | null;
    status: RequirementStatus | null;
    source: string;
    external_ref: string | null;
    tags: string[] | null;
    assigned_to: number | null;
    created_by: number | null;
    updated_by: number | null;
    created_at: string;
    updated_at: string;
    // relations
    project?: { id: number; name: string };
    folder?: { id: number; name: string } | null;
    assignedTo?: { id: number; name: string } | null;
    createdBy?: { id: number; name: string } | null;
    updatedBy?: { id: number; name: string } | null;
    test_cases?: { id: number; title: string }[];
}