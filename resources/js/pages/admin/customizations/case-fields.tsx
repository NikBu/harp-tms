import { Head } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { CustomFieldsPage } from '@/pages/admin/customizations/_custom-fields-page';
import type { CustomField } from '@/pages/admin/customizations/_custom-fields-page';

interface Props {
    fields: CustomField[];
    field_types: string[];
}

export default function CaseFields({ fields, field_types }: Props) {
    return (
        <>
            <Head title="Case Fields" />
            <CustomFieldsPage
                appliesTo="cases"
                title="Case Fields"
                description="Define extra fields that appear on every test case form. Global fields apply to all projects; non-global fields must be enabled per-project."
                fields={fields}
                fieldTypes={field_types}
                storeUrl="/admin/customizations/case-fields"
                updateUrl={(id) => `/admin/customizations/case-fields/${id}`}
                destroyUrl={(id) => `/admin/customizations/case-fields/${id}`}
            />
        </>
    );
}

CaseFields.layout = {
    breadcrumbs: [{ title: 'Administration', href: dashboard() }],
};
