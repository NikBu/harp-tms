export type CustomFieldType =
    | 'string'
    | 'integer'
    | 'text'
    | 'rich_text'
    | 'url'
    | 'checkbox'
    | 'dropdown'
    | 'user'
    | 'date'
    | 'milestone'
    | 'steps'
    | 'step_results'
    | 'multi_select';

export type CustomFieldAppliesTo = 'cases' | 'results';

export interface CustomFieldOption {
    id: number;
    label: string;
    display_order: number;
}

export interface CustomField {
    id: number;
    system_name: string;
    label: string;
    description: string | null;
    field_type: CustomFieldType;
    applies_to: CustomFieldAppliesTo;
    is_global: boolean;
    is_required: boolean;
    display_order: number;
    default_value: string | null;
    options: CustomFieldOption[];
}

/** Map of custom_field_id → raw value, used in form state */
export type CustomValues = Record<number, unknown>;
