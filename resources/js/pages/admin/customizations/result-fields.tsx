import { Head } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { CustomFieldsPage } from '@/pages/admin/customizations/_custom-fields-page';
import type { CustomField, ProjectSummary } from '@/pages/admin/customizations/_custom-fields-page';

interface Props {
    fields: CustomField[];
    field_types: string[];
    projects: ProjectSummary[];
}

export default function ResultFields({ fields, field_types, projects }: Props) {
    return (
        <>
            <Head title="Result Fields" />
            <CustomFieldsPage
                appliesTo="results"
                title="Result Fields"
                description="Define extra fields that appear on every test result form. Global fields apply to all projects; non-global fields must be enabled per-project. You can also attach fields directly to projects here."
                fields={fields}
                fieldTypes={field_types}
                storeUrl="/admin/customizations/result-fields"
                updateUrl={(id) => `/admin/customizations/result-fields/${id}`}
                destroyUrl={(id) => `/admin/customizations/result-fields/${id}`}
                projects={projects}
            />
        </>
    );
}

ResultFields.layout = {
    breadcrumbs: [{ title: 'Administration', href: dashboard() }],
};
