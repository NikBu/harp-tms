import { Head } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { CustomFieldsPage } from '@/pages/admin/customizations/_custom-fields-page';
import type { CustomField } from '@/pages/admin/customizations/_custom-fields-page';

interface Props {
    fields: CustomField[];
    field_types: string[];
}

export default function ResultFields({ fields, field_types }: Props) {
    return (
        <>
            <Head title="Result Fields" />
            <CustomFieldsPage
                appliesTo="results"
                title="Result Fields"
                description="Define extra fields that appear when a tester submits a test result. Global fields apply to all projects; non-global fields must be enabled per-project."
                fields={fields}
                fieldTypes={field_types}
                storeUrl="/admin/customizations/result-fields"
                updateUrl={(id) => `/admin/customizations/result-fields/${id}`}
                destroyUrl={(id) => `/admin/customizations/result-fields/${id}`}
            />
        </>
    );
}

ResultFields.layout = {
    breadcrumbs: [{ title: 'Administration', href: dashboard() }],
};
