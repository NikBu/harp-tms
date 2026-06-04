import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { show, update } from '@/actions/App/Http/Controllers/TestCaseController';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { TestCase } from '@/types/test-case';

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
    steps: StepInput[];
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

export default function TestCasesEdit({
    testCase,
    suite,
    sections,
}: {
    testCase: TestCase;
    suite: Suite & { project: Project };
    sections: Section[];
}) {
    const t = useTrans();

    const { data, setData, patch, processing, errors, transform } =
        useForm<TestCaseForm>({
        title: testCase.title,
        template: testCase.template,
        section_id: testCase.section_id ? String(testCase.section_id) : '',
        priority_id: testCase.priority_id ? String(testCase.priority_id) : '',
        type_id: testCase.type_id !== null ? String(testCase.type_id) : '',
        estimate: testCase.estimate ?? '',
        references: testCase.references ?? '',
        preconditions: testCase.preconditions ?? '',
        body: testCase.body ?? '',
        steps:
            testCase.steps && testCase.steps.length > 0
                ? testCase.steps.map((step, i) => ({
                      action: step.action,
                      expected: step.expected ?? '',
                      display_order: step.display_order ?? i + 1,
                  }))
                : [{ action: '', expected: '', display_order: 1 }],
    });

    const usesSteps =
        data.template === TEMPLATE_STEPS || data.template === TEMPLATE_BDD;
    const usesChecklist = data.template === TEMPLATE_CHECKLIST;
    const usesBody =
        data.template === TEMPLATE_TEXT ||
        data.template === TEMPLATE_EXPLORATORY;

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

    function submit(event: React.FormEvent) {
        event.preventDefault();

        const hasSteps = usesSteps || usesChecklist;

        transform((current) => ({
            ...current,
            steps: hasSteps
                ? current.steps.filter((step) => step.action.trim() !== '')
                : [],
        }));

        patch(update.url(testCase.id));
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
                        <CardTitle>{t('app.test_cases.edit')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-6">
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
                                {errors.title ? (
                                    <p className="text-sm text-destructive">
                                        {errors.title}
                                    </p>
                                ) : null}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="template">
                                    {t('app.test_cases.fields.template')}
                                </Label>
                                <Select
                                    value={String(data.template)}
                                    onValueChange={(value) =>
                                        setData('template', Number(value))
                                    }
                                >
                                    <SelectTrigger id="template">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TEMPLATE_OPTIONS.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={String(option.value)}
                                            >
                                                {t(
                                                    `app.test_cases.templates.${option.key}`,
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="section">
                                        {t('app.test_cases.fields.section')}
                                    </Label>
                                    <Select
                                        value={data.section_id || 'none'}
                                        onValueChange={(value) =>
                                            setData(
                                                'section_id',
                                                value === 'none' ? '' : value,
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

                                <div className="grid gap-2">
                                    <Label htmlFor="priority">
                                        {t('app.test_cases.fields.priority')}
                                    </Label>
                                    <Select
                                        value={data.priority_id || 'none'}
                                        onValueChange={(value) =>
                                            setData(
                                                'priority_id',
                                                value === 'none' ? '' : value,
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
                                            {PRIORITY_OPTIONS.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
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
                                    />
                                </div>
                            </div>

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

                            <div className="grid gap-2">
                                <Label htmlFor="preconditions">
                                    {t('app.test_cases.fields.preconditions')}
                                </Label>
                                <textarea
                                    id="preconditions"
                                    value={data.preconditions}
                                    onChange={(e) =>
                                        setData('preconditions', e.target.value)
                                    }
                                    rows={3}
                                    className={textareaClass}
                                />
                            </div>

                            {usesBody ? (
                                <div className="grid gap-2">
                                    <Label htmlFor="body">
                                        {data.template === TEMPLATE_EXPLORATORY
                                            ? 'Scenario'
                                            : t('app.test_cases.fields.body')}
                                    </Label>
                                    <textarea
                                        id="body"
                                        value={data.body}
                                        onChange={(e) =>
                                            setData('body', e.target.value)
                                        }
                                        rows={6}
                                        className={textareaClass}
                                    />
                                </div>
                            ) : null}

                            {usesSteps || usesChecklist ? (
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
                                            <textarea
                                                value={step.action}
                                                onChange={(e) =>
                                                    setStep(
                                                        index,
                                                        'action',
                                                        e.target.value,
                                                    )
                                                }
                                                rows={2}
                                                placeholder={t(
                                                    'app.test_cases.fields.action',
                                                )}
                                                className={textareaClass}
                                            />
                                            {!usesChecklist ? (
                                                <textarea
                                                    value={step.expected}
                                                    onChange={(e) =>
                                                        setStep(
                                                            index,
                                                            'expected',
                                                            e.target.value,
                                                        )
                                                    }
                                                    rows={2}
                                                    placeholder={t(
                                                        'app.test_cases.fields.expected',
                                                    )}
                                                    className={textareaClass}
                                                />
                                            ) : null}
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
                            ) : null}

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    {t('app.common.save')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={show.url(testCase.id)}>
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
    breadcrumbs: [
        {
            title: 'Projects',
            href: projectsIndex(),
        },
    ],
};
