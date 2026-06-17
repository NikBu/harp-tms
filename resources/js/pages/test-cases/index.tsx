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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
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

const PRIORITY_CLASSES: Record<number, string> = {
    1: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    2: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    3: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    4: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
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
        if (!window.confirm(t('common.confirm_delete'))) return;
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
            <Head title={t('test_cases.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Page header */}
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold">{t('test_cases.title')}</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {cases.total} {cases.total === 1 ? 'test case' : 'test cases'}
                        </p>
                    </div>
                    <Button asChild size="sm">
                        <Link href={create.url(suite.id)}>
                            <Plus className="size-4" />
                            {t('test_cases.create')}
                        </Link>
                    </Button>
                </div>

                {/* Section filter */}
                {sections.length > 0 ? (
                    <div className="w-56">
                        <Select
                            value={filters.section_id ? String(filters.section_id) : 'all'}
                            onValueChange={filterBySection}
                        >
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder={t('test_cases.fields.section')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All sections</SelectItem>
                                {sections.map((section) => (
                                    <SelectItem key={section.id} value={String(section.id)}>
                                        {section.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}

                {/* Empty state */}
                {cases.data.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
                        <ClipboardList className="size-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{t('test_cases.empty')}</p>
                        <Button asChild size="sm" className="mt-2">
                            <Link href={create.url(suite.id)}>
                                <Plus className="size-4" />
                                {t('test_cases.create')}
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-lg border border-border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40">
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {t('test_cases.fields.title')}
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {t('test_cases.fields.section')}
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {t('test_cases.fields.template')}
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {t('test_cases.fields.priority')}
                                    </th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {cases.data.map((testCase) => (
                                    <tr key={testCase.id} className="group hover:bg-muted/30">
                                        <td className="px-4 py-3">
                                            <Link
                                                href={show.url(testCase.id)}
                                                className="font-medium text-foreground hover:text-primary hover:underline"
                                            >
                                                {testCase.title}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {testCase.section?.name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="secondary" className="text-xs font-normal">
                                                {t(`test_cases.templates.${TEMPLATE_KEYS[testCase.template] ?? 'steps'}`)}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {testCase.priority_id ? (
                                                <span className={cn(
                                                    'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
                                                    PRIORITY_CLASSES[testCase.priority_id] ?? PRIORITY_CLASSES[4],
                                                )}>
                                                    {PRIORITY_KEYS[testCase.priority_id]}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild title={t('common.edit')}>
                                                    <Link href={edit.url(testCase.id)}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => deleteCase(testCase)}
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {cases.last_page > 1 ? (
                    <div className="flex flex-wrap gap-1">
                        {cases.links.map((link) => (
                            <Button
                                key={link.label}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={link.url === null}
                                onClick={() => { if (link.url) router.visit(link.url); }}
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
        { title: 'Projects', href: projectsIndex() },
    ],
};
