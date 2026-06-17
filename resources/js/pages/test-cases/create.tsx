import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import type { Project, Section, Suite } from '@/types';
import {
    TEMPLATE_BDD,
    TEMPLATE_CHECKLIST,
    TEMPLATE_EXPLORATORY,
    TEMPLATE_STEPS,
    TEMPLATE_TEXT,
    TEST_CASE_TYPES,
} from '@/types/test-case';
import type { ChecklistItem, LinkedRequirement } from '@/types/test-case';
import {
    index as casesIndex,
    store,
} from '@/actions/App/Http/Controllers/TestCaseController';
import { index as projectsIndex } from '@/routes/projects';

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
    assigned_to: string;
    estimate: string;
    references: string;
    preconditions: string;
    body: string;
    bdd_scenario: string;
    checklist_items: ChecklistItem[];
    steps: StepInput[];
    requirement_ids: number[];
    add_and_create: boolean;
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

// Accepts a plain integer (seconds) or duration tokens like "1h 30m 15s".
const ESTIMATE_PATTERN = /^(\d+|(\d+\s*h)?\s*(\d+\s*m)?\s*(\d+\s*s)?)$/i;

const PRIORITY_COLORS: Record<string, string> = {
    critical: 'text-destructive',
    high: 'text-orange-500',
    medium: 'text-yellow-600',
    low: 'text-muted-foreground',
};

export default function TestCasesCreate({
    suite,
    suites = [],
    sections,
    requirements,
    members = [],
}: {
    suite: (Suite & { project: Project }) | null;
    suites?: { id: number; name: string }[];
    sections: Section[];
    requirements: LinkedRequirement[];
    members?: { id: number; name: string }[];
}) {
    const t = useTrans();

    const needsSuitePicker = !suite;
    const [suiteId, setSuiteId] = useState<string>(
        suite ? String(suite.id) : '',
    );
    const [dynamicSections, setDynamicSections] = useState<Section[]>(sections);

    useEffect(() => {
        if (!needsSuitePicker) {
            return;
        }

        if (!suiteId) {
            setDynamicSections([]);

            return;
        }

        let cancelled = false;

        fetch(`/api/suites/${suiteId}/sections`)
            .then((r) => r.json())
            .then((data) => {
                if (!cancelled) {
                    setDynamicSections(data as Section[]);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setDynamicSections([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [needsSuitePicker, suiteId]);

    const availableSections = needsSuitePicker ? dynamicSections : sections;

    const [submitting, setSubmitting] = useState(false);

    const {
        data,
        setData,
        errors,
        setError,
        clearErrors,
    } = useForm<TestCaseForm>({
        title: '',
        template: TEMPLATE_STEPS,
        section_id: '',
        priority_id: '',
        type_id: '',
        assigned_to: '',
        estimate: '',
        references: '',
        preconditions: '',
        body: '',
        bdd_scenario: '',
        checklist_items: [],
        steps: [{ action: '', expected: '', display_order: 1 }],
        requirement_ids: [],
        add_and_create: false,
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

        if (target < 0 || target >= data.steps.length) {
            return;
        }

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

    const addAndCreateRef = useRef(false);

    function submit(event?: React.FormEvent, andCreate = false) {
        event?.preventDefault();
        if (!andCreate) addAndCreateRef.current = false;

        if (needsSuitePicker && !suiteId) {
            setError('section_id', t('test_cases.errors.suite_required'));

            return;
        }

        if (
            data.estimate.trim() !== '' &&
            !ESTIMATE_PATTERN.test(data.estimate.trim())
        ) {
            setError('estimate', t('test_cases.errors.estimate_format'));

            return;
        }

        clearErrors('estimate');

        const payload = {
            ...data,
            add_and_create: addAndCreateRef.current,
            steps: usesSteps
                ? data.steps.filter((s) => s.action.trim() !== '')
                : [],
            checklist_items: usesChecklist
                ? data.checklist_items.filter((i) => i.label.trim() !== '')
                : [],
            bdd_scenario: usesBdd ? data.bdd_scenario : '',
            body: usesBody ? data.body : '',
        };

        setSubmitting(true);
        router.post(store.url(Number(suiteId)), payload, {
            onFinish: () => {
                setSubmitting(false);
                addAndCreateRef.current = false;
            },
        });
    }

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                submit();
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    });

    return (
        <>
            <Head title={t('test_cases.create')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <h1 className="text-2xl font-semibold">
                    {t('test_cases.create')}
                </h1>

                <Card className="max-w-3xl">
                    <CardHeader>
                        <CardTitle>{t('test_cases.create')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-6">
                            {/* Suite picker (global create only) */}
                            {needsSuitePicker && (
                                <div className="grid gap-2">
                                    <Label htmlFor="suite">
                                        {t('test_cases.fields.suite')} *
                                    </Label>
                                    <Select
                                        value={suiteId}
                                        onValueChange={(v) => {
                                            setSuiteId(v);
                                            setData('section_id', '');
                                            clearErrors('section_id');
                                        }}
                                    >
                                        <SelectTrigger id="suite">
                                            <SelectValue
                                                placeholder={t(
                                                    'test_cases.fields.suite',
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suites.map((s) => (
                                                <SelectItem
                                                    key={s.id}
                                                    value={String(s.id)}
                                                >
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.section_id && !suiteId && (
                                        <p className="text-sm text-destructive">
                                            {errors.section_id}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Title */}
                            <div className="grid gap-2">
                                <Label htmlFor="title">
                                    {t('test_cases.fields.title')}
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
                                    {t('test_cases.fields.template')}
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
                                                    `test_cases.templates.${opt.key}`,
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
                                        {t('test_cases.fields.section')}
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
                                                    'test_cases.fields.section',
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                —
                                            </SelectItem>
                                            {availableSections.map((s) => (
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
                                        {t('test_cases.fields.priority')}
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
                                                    'test_cases.fields.priority',
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
                                        {t('test_cases.fields.type')}
                                    </Label>
                                    <Select
                                        value={data.type_id || 'none'}
                                        onValueChange={(v) =>
                                            setData(
                                                'type_id',
                                                v === 'none' ? '' : v,
                                            )
                                        }
                                    >
                                        <SelectTrigger id="type">
                                            <SelectValue
                                                placeholder={t(
                                                    'test_cases.fields.type_placeholder',
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                —
                                            </SelectItem>
                                            {TEST_CASE_TYPES.map((type) => (
                                                <SelectItem
                                                    key={type}
                                                    value={type}
                                                    className="capitalize"
                                                >
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {members.length > 0 && (
                                <div className="grid gap-2">
                                    <Label htmlFor="assigned_to">
                                        {t('test_cases.fields.assigned_to')}
                                    </Label>
                                    <Select
                                        value={data.assigned_to || 'none'}
                                        onValueChange={(v) =>
                                            setData('assigned_to', v === 'none' ? '' : v)
                                        }
                                    >
                                        <SelectTrigger id="assigned_to">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">—</SelectItem>
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={String(m.id)}>
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="estimate">
                                        {t('test_cases.fields.estimate')}
                                    </Label>
                                    <Input
                                        id="estimate"
                                        value={data.estimate}
                                        onChange={(e) =>
                                            setData('estimate', e.target.value)
                                        }
                                        placeholder="e.g. 1h 30m"
                                    />
                                    {errors.estimate && (
                                        <p className="text-sm text-destructive">
                                            {errors.estimate}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* References */}
                            <div className="grid gap-2">
                                <Label htmlFor="references">
                                    {t('test_cases.fields.references')}
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
                                    {t('test_cases.fields.preconditions')}
                                </Label>
                                <RichTextEditor
                                    value={data.preconditions}
                                    onChange={(v) =>
                                        setData('preconditions', v)
                                    }
                                />
                            </div>

                            {/* Body (text / exploratory) */}
                            {usesBody && (
                                <div className="grid gap-2">
                                    <Label htmlFor="body">
                                        {data.template === TEMPLATE_EXPLORATORY
                                            ? t(
                                                  'test_cases.fields.scenario',
                                              )
                                            : t('test_cases.fields.body')}
                                    </Label>
                                    <RichTextEditor
                                        value={data.body}
                                        onChange={(v) => setData('body', v)}
                                    />
                                </div>
                            )}

                            {/* BDD scenario */}
                            {usesBdd && (
                                <div className="grid gap-2">
                                    <Label htmlFor="bdd_scenario">
                                        {t(
                                            'test_cases.fields.bdd_scenario',
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
                                        {t('test_cases.fields.steps')}
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
                                            <div className="grid gap-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground">
                                                    {t('test_cases.fields.action')}
                                                </Label>
                                                <RichTextEditor
                                                    value={step.action}
                                                    onChange={(v) =>
                                                        setStep(index, 'action', v)
                                                    }
                                                    placeholder={t('test_cases.fields.action')}
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground">
                                                    {t('test_cases.fields.expected')}
                                                </Label>
                                                <RichTextEditor
                                                    value={step.expected}
                                                    onChange={(v) =>
                                                        setStep(index, 'expected', v)
                                                    }
                                                    placeholder={t('test_cases.fields.expected')}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addStep}
                                    >
                                        <Plus className="size-4" />
                                        {t('test_cases.fields.steps')}
                                    </Button>
                                </div>
                            )}

                            {/* Checklist */}
                            {usesChecklist && (
                                <div className="grid gap-3">
                                    <Label>
                                        {t('test_cases.fields.checklist')}
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
                                                    'test_cases.fields.checklist_item',
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
                                            'test_cases.fields.checklist_item',
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* Requirements */}
                            {requirements.length > 0 && (
                                <div className="grid gap-2">
                                    <Label>{t('requirements.label')}</Label>
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
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" disabled={submitting}>
                                    {t('test_cases.add_test_case')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={submitting}
                                    onClick={() => {
                                        addAndCreateRef.current = true;
                                        submit();
                                    }}
                                >
                                    {t('test_cases.add_and_create')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link
                                        href={
                                            suite
                                                ? casesIndex.url(suite.id)
                                                : projectsIndex().url
                                        }
                                    >
                                        {t('common.cancel')}
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

TestCasesCreate.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
