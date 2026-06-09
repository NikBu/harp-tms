import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import {
    index as casesIndex,
    update,
} from '@/actions/App/Http/Controllers/TestCaseController';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project, Section, Suite } from '@/types';
import {
    TEMPLATE_BDD,
    TEMPLATE_CHECKLIST,
    TEMPLATE_EXPLORATORY,
    TEMPLATE_STEPS,
    TEMPLATE_TEXT,
} from '@/types/test-case';
import type {
    ChecklistItem,
    LinkedRequirement,
    TestCase,
} from '@/types/test-case';

type StepInput = {
    action: string;
    expected: string;
    display_order: number;
};

type TestCaseForm = {
    title: string;
    template: number;
    section_id: string;
    priority_id: string;
    type_id: string;
    estimate: string;
    references: string;
    preconditions: string;
    body: string;
    bdd_scenario: string;
    checklist_items: ChecklistItem[];
    steps: StepInput[];
    requirement_ids: number[];
};

const TEMPLATE_OPTIONS = [
    { value: TEMPLATE_TEXT, key: 'text' },
    { value: TEMPLATE_STEPS, key: 'steps' },
    { value: TEMPLATE_EXPLORATORY, key: 'exploratory' },
    { value: TEMPLATE_BDD, key: 'bdd' },
    { value: TEMPLATE_CHECKLIST, key: 'checklist' },
];

const PRIORITY_OPTIONS = [
    { value: '1', label: 'Critical' },
    { value: '2', label: 'High' },
    { value: '3', label: 'Medium' },
    { value: '4', label: 'Low' },
];

const textareaClass =
    'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const PRIORITY_COLORS: Record<string, string> = {
    critical: 'text-destructive',
    high: 'text-orange-500',
    medium: 'text-yellow-600',
    low: 'text-muted-foreground',
};

export default function TestCasesEdit({
    testCase,
    suite,
    sections,
    requirements,
}: {
    testCase: TestCase;
    suite: Suite & { project: Project };
    sections: Section[];
    requirements: LinkedRequirement[];
}) {
    const t = useTrans();

    const { data, setData, put, processing, errors, transform } =
        useForm<TestCaseForm>({
            title: testCase.title,
            template: testCase.template,
            section_id: testCase.section_id ? String(testCase.section_id) : '',
            priority_id: testCase.priority_id
                ? String(testCase.priority_id)
                : '',
            type_id: testCase.type_id ?? '',
            estimate: testCase.estimate ?? '',
            references: testCase.references ?? '',
            preconditions: testCase.preconditions ?? '',
            body: testCase.body ?? '',
            bdd_scenario: testCase.bdd_scenario ?? '',
            checklist_items: testCase.checklist_items ?? [],
            steps: testCase.steps?.map((s) => ({
                action: s.action,
                expected: s.expected ?? '',
                display_order: s.display_order,
            })) ?? [{ action: '', expected: '', display_order: 1 }],
            requirement_ids: testCase.requirements?.map((r) => r.id) ?? [],
        });

    const usesSteps = data.template === TEMPLATE_STEPS;
    const usesBdd = data.template === TEMPLATE_BDD;
    const usesChecklist = data.template === TEMPLATE_CHECKLIST;
    const usesBody =
        data.template === TEMPLATE_TEXT ||
        data.template === TEMPLATE_EXPLORATORY;

    // ── Requirement toggle ────────────────────────────────────────────────────

    function toggleRequirement(id: number) {
        setData(
            'requirement_ids',
            data.requirement_ids.includes(id)
                ? data.requirement_ids.filter((r) => r !== id)
                : [...data.requirement_ids, id],
        );
    }

    // ── Step helpers ──────────────────────────────────────────────────────────

    function setStep(index: number, key: keyof StepInput, value: string) {
        const next = [...data.steps];
        next[index] = { ...next[index], [key]: value };
        setData('steps', next);
    }

    function addStep() {
        setData('steps', [
            ...data.steps,
            { action: '', expected: '', display_order: data.steps.length + 1 },
        ]);
    }

    function removeStep(index: number) {
        setData(
            'steps',
            data.steps
                .filter((_, i) => i !== index)
                .map((step, i) => ({ ...step, display_order: i + 1 })),
        );
    }

    function moveStep(index: number, direction: -1 | 1) {
        const target = index + direction;
        if (target < 0 || target >= data.steps.length) return;
        const next = [...data.steps];
        [next[index], next[target]] = [next[target], next[index]];
        setData(
            'steps',
            next.map((step, i) => ({ ...step, display_order: i + 1 })),
        );
    }

    // ── Checklist helpers ─────────────────────────────────────────────────────

    function setChecklistLabel(index: number, label: string) {
        const next = [...data.checklist_items];
        next[index] = { ...next[index], label };
        setData('checklist_items', next);
    }

    function addChecklistItem() {
        setData('checklist_items', [
            ...data.checklist_items,
            { label: '', is_optional: false },
        ]);
    }

    function removeChecklistItem(index: number) {
        setData(
            'checklist_items',
            data.checklist_items.filter((_, i) => i !== index),
        );
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    function submit(event: React.FormEvent) {
        event.preventDefault();

        transform((current) => ({
            ...current,
            steps: usesSteps
                ? current.steps.filter((s) => s.action.trim() !== '')
                : [],
            checklist_items: usesChecklist
                ? current.checklist_items.filter((i) => i.label.trim() !== '')
                : [],
            bdd_scenario: usesBdd ? current.bdd_scenario : '',
            body: usesBody ? current.body : '',
        }));

        put(update.url(testCase.id));
    }

    return (
        <>
            <Head title={t('app.test_cases.edit')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <h1 className="text-2xl font-semibold">
                    {t('app.test_cases.edit')}
                </h1>

                <Card className="max-w-3xl">
                    <CardHeader>
                        <CardTitle>{testCase.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-6">
                            {/* Title */}
                            <div className="grid gap-2">
                                <Label htmlFor="title">
                                    {t('app.test_cases.fields.title')}
                                </Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                    autoFocus
                                />
                                {errors.title && (
                                    <p className="text-sm text-destructive">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            {/* Template */}
                            <div className="grid gap-2">
                                <Label htmlFor="template">
                                    {t('app.test_cases.fields.template')}
                                </Label>
                                <Select
                                    value={String(data.template)}
                                    onValueChange={(v) =>
                                        setData('template', Number(v))
                                    }
                                >
                                    <SelectTrigger id="template">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TEMPLATE_OPTIONS.map((opt) => (
                                            <SelectItem
                                                key={opt.value}
                                                value={String(opt.value)}
                                            >
                                                {t(
                                                    `app.test_cases.templates.${opt.key}`,
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Section / Priority / Type / Estimate */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="section">
                                        {t('app.test_cases.fields.section')}
                                    </Label>
                                    <Select
                                        value={data.section_id || 'none'}
                                        onValueChange={(v) =>
                                            setData(
                                                'section_id',
                                                v === 'none' ? '' : v,
                                            )
                                        }
                                    >
                                        <SelectTrigger id="section">
                                            <SelectValue
                                                placeholder={t(
                                                    'app.test_cases.fields.section',
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                —
                                            </SelectItem>
                                            {sections.map((s) => (
                                                <SelectItem
                                                    key={s.id}
                                                    value={String(s.id)}
                                                >
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="priority">
                                        {t('app.test_cases.fields.priority')}
                                    </Label>
                                    <Select
                                        value={data.priority_id || 'none'}
                                        onValueChange={(v) =>
                                            setData(
                                                'priority_id',
                                                v === 'none' ? '' : v,
                                            )
                                        }
                                    >
                                        <SelectTrigger id="priority">
                                            <SelectValue
                                                placeholder={t(
                                                    'app.test_cases.fields.priority',
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                —
                                            </SelectItem>
                                            {PRIORITY_OPTIONS.map((opt) => (
                                                <SelectItem
                                                    key={opt.value}
                                                    value={opt.value}
                                                >
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="type">
                                        {t('app.test_cases.fields.type')}
                                    </Label>
                                    <Input
                                        id="type"
                                        value={data.type_id}
                                        onChange={(e) =>
                                            setData('type_id', e.target.value)
                                        }
                                        placeholder="e.g. functional"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="estimate">
                                        {t('app.test_cases.fields.estimate')}
                                    </Label>
                                    <Input
                                        id="estimate"
                                        value={data.estimate}
                                        onChange={(e) =>
                                            setData('estimate', e.target.value)
                                        }
                                        placeholder="e.g. 1h 30m"
                                    />
                                </div>
                            </div>

                            {/* References */}
                            <div className="grid gap-2">
                                <Label htmlFor="references">
                                    {t('app.test_cases.fields.references')}
                                </Label>
                                <Input
                                    id="references"
                                    value={data.references}
                                    onChange={(e) =>
                                        setData('references', e.target.value)
                                    }
                                />
                            </div>

                            {/* Preconditions */}
                            <div className="grid gap-2">
                                <Label htmlFor="preconditions">
                                    {t('app.test_cases.fields.preconditions')}
                                </Label>
                                <RichTextEditor
                                    value={data.preconditions}
                                    onChange={(v) =>
                                        setData('preconditions', v)
                                    }
                                />
                            </div>

                            {/* Body */}
                            {usesBody && (
                                <div className="grid gap-2">
                                    <Label htmlFor="body">
                                        {data.template === TEMPLATE_EXPLORATORY
                                            ? t(
                                                  'app.test_cases.fields.scenario',
                                              )
                                            : t('app.test_cases.fields.body')}
                                    </Label>
                                    <RichTextEditor
                                        value={data.body}
                                        onChange={(v) => setData('body', v)}
                                    />
                                </div>
                            )}

                            {/* BDD */}
                            {usesBdd && (
                                <div className="grid gap-2">
                                    <Label htmlFor="bdd_scenario">
                                        {t(
                                            'app.test_cases.fields.bdd_scenario',
                                        )}
                                    </Label>
                                    <textarea
                                        id="bdd_scenario"
                                        value={data.bdd_scenario}
                                        onChange={(e) =>
                                            setData(
                                                'bdd_scenario',
                                                e.target.value,
                                            )
                                        }
                                        rows={8}
                                        placeholder={
                                            'Given ...\nWhen ...\nThen ...'
                                        }
                                        className={`${textareaClass} font-mono text-xs`}
                                    />
                                </div>
                            )}

                            {/* Steps */}
                            {usesSteps && (
                                <div className="grid gap-3">
                                    <Label>
                                        {t('app.test_cases.fields.steps')}
                                    </Label>
                                    {data.steps.map((step, index) => (
                                        <div
                                            key={index}
                                            className="grid gap-2 rounded-md border p-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    #{index + 1}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            moveStep(index, -1)
                                                        }
                                                    >
                                                        <ArrowUp className="size-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            moveStep(index, 1)
                                                        }
                                                    >
                                                        <ArrowDown className="size-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            removeStep(index)
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <RichTextEditor
                                                value={step.action}
                                                onChange={(v) =>
                                                    setStep(index, 'action', v)
                                                }
                                                placeholder={t(
                                                    'app.test_cases.fields.action',
                                                )}
                                            />
                                            <RichTextEditor
                                                value={step.expected}
                                                onChange={(v) =>
                                                    setStep(
                                                        index,
                                                        'expected',
                                                        v,
                                                    )
                                                }
                                                placeholder={t(
                                                    'app.test_cases.fields.expected',
                                                )}
                                            />
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addStep}
                                    >
                                        <Plus className="size-4" />
                                        {t('app.test_cases.fields.steps')}
                                    </Button>
                                </div>
                            )}

                            {/* Checklist */}
                            {usesChecklist && (
                                <div className="grid gap-3">
                                    <Label>
                                        {t('app.test_cases.fields.checklist')}
                                    </Label>
                                    {data.checklist_items.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2"
                                        >
                                            <span className="w-6 text-xs text-muted-foreground">
                                                {index + 1}.
                                            </span>
                                            <Input
                                                value={item.label}
                                                onChange={(e) =>
                                                    setChecklistLabel(
                                                        index,
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder={t(
                                                    'app.test_cases.fields.checklist_item',
                                                )}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    removeChecklistItem(index)
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addChecklistItem}
                                    >
                                        <Plus className="size-4" />
                                        {t(
                                            'app.test_cases.fields.checklist_item',
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* Requirements */}
                            {requirements.length > 0 && (
                                <div className="grid gap-2">
                                    <Label>{t('app.requirements.label')}</Label>
                                    <div className="max-h-56 divide-y overflow-y-auto rounded-md border">
                                        {requirements.map((req) => {
                                            const checked =
                                                data.requirement_ids.includes(
                                                    req.id,
                                                );
                                            return (
                                                <label
                                                    key={req.id}
                                                    className="flex cursor-pointer items-center gap-3 px-3 py-2 select-none hover:bg-muted/40"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() =>
                                                            toggleRequirement(
                                                                req.id,
                                                            )
                                                        }
                                                        className="size-4 rounded border-input accent-primary"
                                                    />
                                                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                                                        {req.display_id}
                                                    </span>
                                                    <span className="flex-1 truncate text-sm">
                                                        {req.title}
                                                    </span>
                                                    {req.priority && (
                                                        <span
                                                            className={`shrink-0 text-xs capitalize ${PRIORITY_COLORS[req.priority] ?? ''}`}
                                                        >
                                                            {req.priority}
                                                        </span>
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {errors.requirement_ids && (
                                        <p className="text-sm text-destructive">
                                            {errors.requirement_ids}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    {t('app.common.save')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={casesIndex.url(suite.id)}>
                                        {t('app.common.cancel')}
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

TestCasesEdit.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
