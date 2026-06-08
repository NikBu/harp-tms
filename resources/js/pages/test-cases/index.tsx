import { Head, Link, router } from '@inertiajs/react';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import {
    create,
    destroy,
    edit,
    index as casesIndex,
    show,
} from '@/actions/App/Http/Controllers/TestCaseController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { PaginatedData, Project, Section, Suite } from '@/types';
import type { TestCase } from '@/types/test-case';

const TEMPLATE_KEYS: Record<number, string> = {
    1: 'text',
    2: 'steps',
    3: 'exploratory',
    4: 'bdd',
    5: 'checklist',
};

const PRIORITY_KEYS: Record<number, string> = {
    1: 'critical',
    2: 'high',
    3: 'medium',
    4: 'low',
};

export default function TestCasesIndex({
    suite,
    cases,
    sections = [],
    filters = {},
}: {
    suite: Suite & { project: Project };
    cases: PaginatedData<TestCase>;
    sections?: Section[];
    filters?: { section_id?: number | null };
}) {
    const t = useTrans();

    function deleteCase(testCase: TestCase) {
        if (!window.confirm(t('app.common.confirm_delete'))) {
            return;
        }

        router.delete(destroy.url(testCase.id), { preserveScroll: true });
    }

    function filterBySection(value: string) {
        router.get(
            casesIndex.url(suite.id),
            value === 'all' ? {} : { section_id: value },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title={t('app.test_cases.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold">
                        {t('app.test_cases.title')}
                    </h1>
                    <Button asChild>
                        <Link href={create.url(suite.id)}>
                            <Plus className="size-4" />
                            {t('app.test_cases.create')}
                        </Link>
                    </Button>
                </div>

                {sections.length > 0 ? (
                    <div className="w-64">
                        <Select
                            value={
                                filters.section_id
                                    ? String(filters.section_id)
                                    : 'all'
                            }
                            onValueChange={filterBySection}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue
                                    placeholder={t(
                                        'app.test_cases.fields.section',
                                    )}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t('app.test_cases.fields.section')}
                                </SelectItem>
                                {sections.map((section) => (
                                    <SelectItem
                                        key={section.id}
                                        value={String(section.id)}
                                    >
                                        {section.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}

                {cases.data.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
                        <ClipboardList className="size-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            {t('app.test_cases.empty')}
                        </p>
                        <Button asChild className="mt-2">
                            <Link href={create.url(suite.id)}>
                                <Plus className="size-4" />
                                {t('app.test_cases.create')}
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="px-4 py-3 font-medium">
                                                {t(
                                                    'app.test_cases.fields.title',
                                                )}
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                {t(
                                                    'app.test_cases.fields.template',
                                                )}
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                {t(
                                                    'app.test_cases.fields.section',
                                                )}
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                {t(
                                                    'app.test_cases.fields.priority',
                                                )}
                                            </th>
                                            <th className="px-4 py-3 text-right font-medium" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cases.data.map((testCase) => (
                                            <tr
                                                key={testCase.id}
                                                className="border-b last:border-0 hover:bg-muted/50"
                                            >
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={show.url(
                                                            testCase.id,
                                                        )}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {testCase.title}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary">
                                                        {t(
                                                            `app.test_cases.templates.${TEMPLATE_KEYS[testCase.template] ?? 'steps'}`,
                                                        )}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {testCase.section?.name ??
                                                        '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {testCase.priority_id ? (
                                                        <Badge variant="outline">
                                                            {
                                                                PRIORITY_KEYS[
                                                                    testCase
                                                                        .priority_id
                                                                ]
                                                            }
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            asChild
                                                            title={t(
                                                                'app.common.edit',
                                                            )}
                                                        >
                                                            <Link
                                                                href={edit.url(
                                                                    testCase.id,
                                                                )}
                                                            >
                                                                <Pencil className="size-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                deleteCase(
                                                                    testCase,
                                                                )
                                                            }
                                                            title={t(
                                                                'app.common.delete',
                                                            )}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {cases.last_page > 1 ? (
                    <div className="flex flex-wrap gap-1">
                        {cases.links.map((link) => (
                            <Button
                                key={link.label}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={link.url === null}
                                onClick={() => {
                                    if (link.url) {
                                        router.visit(link.url);
                                    }
                                }}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </>
    );
}

TestCasesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Projects',
            href: projectsIndex(),
        },
    ],
};
