import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Copy, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RichContent } from '@/components/ui/rich-content';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTrans } from '@/hooks/use-trans';
import type { Project, Suite } from '@/types';
import {
    TEMPLATE_BDD,
    TEMPLATE_CHECKLIST,
    TEMPLATE_STEPS,
} from '@/types/test-case';
import type { LinkedRequirement, TestCase } from '@/types/test-case';
import {
    copy,
    destroy,
    edit,
    index as casesIndex,
    show as showCase,
} from '@/actions/App/Http/Controllers/TestCaseController';
import { index as projectsIndex } from '@/routes/projects';

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

const STATUS_COLORS: Record<string, string> = {
    approved: 'text-green-600 dark:text-green-400',
    'under review': 'text-yellow-600 dark:text-yellow-400',
    draft: 'text-muted-foreground',
    obsolete: 'text-destructive',
};

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid grid-cols-3 gap-2 border-b py-2 last:border-0">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="col-span-2 text-sm">{value}</dd>
        </div>
    );
}

function RequirementBadge({ req }: { req: LinkedRequirement }) {
    const statusColor = req.status
        ? (STATUS_COLORS[req.status] ?? 'text-muted-foreground')
        : '';

    return (
        <li className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                {req.display_id}
            </span>
            <span className="flex-1 truncate text-sm">{req.title}</span>
            {req.priority && (
                <span className="shrink-0 text-xs text-muted-foreground capitalize">
                    {req.priority}
                </span>
            )}
            {req.status && (
                <span className={`shrink-0 text-xs capitalize ${statusColor}`}>
                    {req.status}
                </span>
            )}
        </li>
    );
}

export default function TestCasesShow({
    testCase,
    suiteId,
    prevCaseId,
    nextCaseId,
    projectSuites,
}: {
    testCase: TestCase;
    suite: Suite & { project: Project };
    suiteId: number;
    prevCaseId: number | null;
    nextCaseId: number | null;
    projectSuites: Pick<Suite, 'id' | 'name'>[];
}) {
    const t = useTrans();
    const [copyOpen, setCopyOpen] = useState(false);
    const [copying, setCopying] = useState(false);
    const [targetSuite, setTargetSuite] = useState<string>('');

    const usesSteps =
        testCase.template === TEMPLATE_STEPS ||
        testCase.template === TEMPLATE_BDD;
    const usesChecklist = testCase.template === TEMPLATE_CHECKLIST;

    function deleteCase() {
        if (!window.confirm(t('common.confirm_delete'))) {
            return;
        }

        router.delete(destroy.url(testCase.id));
    }

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            const target = event.target as HTMLElement | null;

            if (
                target &&
                (target.isContentEditable ||
                    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
            ) {
                return;
            }

            if (event.key === 'e' || event.key === 'E') {
                event.preventDefault();
                router.visit(edit.url(testCase.id));
            } else if (event.key === 'j' || event.key === 'J') {
                if (nextCaseId !== null) {
                    event.preventDefault();
                    router.visit(showCase.url(nextCaseId));
                }
            } else if (event.key === 'k' || event.key === 'K') {
                if (prevCaseId !== null) {
                    event.preventDefault();
                    router.visit(showCase.url(prevCaseId));
                }
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [testCase.id, prevCaseId, nextCaseId]);

    function submitCopy(event: React.FormEvent) {
        event.preventDefault();

        if (!targetSuite || copying) {
            return;
        }

        setCopying(true);
        router.post(
            copy.url(testCase.id),
            { suite_id: Number(targetSuite) },
            {
                onSuccess: () => {
                    setCopyOpen(false);
                    setCopying(false);
                },
                onError: () => setCopying(false),
            },
        );
    }

    return (
        <>
            <Head title={testCase.title} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Link
                    href={casesIndex.url(suiteId)}
                    className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    {t('test_cases.back_to_suite')}
                </Link>

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <h1 className="text-2xl font-semibold">{testCase.title}</h1>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={edit.url(testCase.id)}>
                                <Pencil className="size-4" />
                                {t('common.edit')}
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setCopyOpen(true)}
                        >
                            <Copy className="size-4" />
                            {t('common.copy')}
                        </Button>
                        <Button variant="destructive" onClick={deleteCase}>
                            <Trash2 className="size-4" />
                            {t('common.delete')}
                        </Button>
                    </div>
                </div>

                {/* Meta */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            {t('test_cases.fields.template')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl>
                            <MetaRow
                                label={t('test_cases.fields.template')}
                                value={t(
                                    `test_cases.templates.${TEMPLATE_KEYS[testCase.template] ?? 'steps'}`,
                                )}
                            />
                            <MetaRow
                                label={t('test_cases.fields.priority')}
                                value={
                                    testCase.priority_id
                                        ? PRIORITY_KEYS[testCase.priority_id]
                                        : '—'
                                }
                            />
                            <MetaRow
                                label={t('test_cases.fields.type')}
                                value={
                                    testCase.type_id !== null
                                        ? String(testCase.type_id)
                                        : '—'
                                }
                            />
                            <MetaRow
                                label={t('test_cases.fields.estimate')}
                                value={testCase.estimate ?? '—'}
                            />
                            <MetaRow
                                label={t('test_cases.fields.references')}
                                value={testCase.references ?? '—'}
                            />
                            <MetaRow
                                label={t('test_cases.fields.section')}
                                value={testCase.section?.name ?? '—'}
                            />
                        </dl>
                    </CardContent>
                </Card>

                {/* Preconditions */}
                {testCase.preconditions ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('test_cases.fields.preconditions')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RichContent html={testCase.preconditions} />
                        </CardContent>
                    </Card>
                ) : null}

                {/* Steps table */}
                {usesSteps ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('test_cases.fields.steps')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="w-12 px-4 py-2 font-medium">
                                            #
                                        </th>
                                        <th className="px-4 py-2 font-medium">
                                            {t('test_cases.fields.action')}
                                        </th>
                                        <th className="px-4 py-2 font-medium">
                                            {t(
                                                'test_cases.fields.expected',
                                            )}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(testCase.steps ?? []).map(
                                        (step, index) => (
                                            <tr
                                                key={step.id}
                                                className="border-b align-top last:border-0"
                                            >
                                                <td className="px-4 py-2 text-muted-foreground">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <RichContent
                                                        html={step.action}
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <RichContent
                                                        html={
                                                            step.expected ?? ''
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                ) : usesChecklist && testCase.checklist_items?.length ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('test_cases.fields.checklist')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="flex flex-col gap-2">
                                {testCase.checklist_items.map((item, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <span className="w-5 shrink-0 text-muted-foreground">
                                            {index + 1}.
                                        </span>
                                        <span>{item.label}</span>
                                        {item.is_optional && (
                                            <span className="ml-1 text-xs text-muted-foreground">
                                                ({t('common.optional')})
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ) : testCase.body ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('test_cases.fields.body')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RichContent html={testCase.body} />
                        </CardContent>
                    </Card>
                ) : null}

                {/* BDD scenario (shown alongside steps table for bdd template) */}
                {testCase.bdd_scenario ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('test_cases.fields.bdd_scenario')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="font-mono text-sm whitespace-pre-wrap">
                                {testCase.bdd_scenario}
                            </pre>
                        </CardContent>
                    </Card>
                ) : null}

                {/* Linked requirements */}
                {testCase.requirements && testCase.requirements.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('requirements.label')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ul className="divide-y">
                                {testCase.requirements.map((req) => (
                                    <RequirementBadge key={req.id} req={req} />
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ) : null}
            </div>

            {/* Copy dialog */}
            <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
                <DialogContent>
                    <form onSubmit={submitCopy} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>{t('common.copy')}</DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-2">
                            <Label htmlFor="copy-suite">
                                {t('navigation.suites')}
                            </Label>
                            <Select
                                value={targetSuite}
                                onValueChange={setTargetSuite}
                            >
                                <SelectTrigger id="copy-suite">
                                    <SelectValue
                                        placeholder={t('navigation.suites')}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectSuites.map((option) => (
                                        <SelectItem
                                            key={option.id}
                                            value={String(option.id)}
                                        >
                                            {option.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCopyOpen(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={!targetSuite || copying}>
                                {copying ? t('common.saving') : t('common.copy')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

TestCasesShow.layout = {
    breadcrumbs: [
        {
            title: 'Projects',
            href: projectsIndex(),
        },
    ],
};
