import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project } from '@/types';
import type { Milestone } from '@/types/project';
import { TEST_CASE_TYPES } from '@/types/test-case';

type Suite = { id: number; name: string };
type Member = { id: number; name: string };

type SectionNode = {
    id: number;
    name: string;
    suite_id: number;
    parent_id: number | null;
    test_cases?: { id: number; title: string; section_id: number }[];
    children?: SectionNode[];
};

type SelectionMode = 'all' | 'specific' | 'dynamic';

type RunForm = {
    name: string;
    description: string;
    refs: string;
    suite_id: string;
    milestone_id: string;
    assigned_to: string;
    start_on: string;
    end_on: string;
    include_all: boolean;
    case_ids: number[];
    filter_priority: string;
    filter_type: string;
    add_and_create: boolean;
};

const PRIORITY_OPTIONS = [
    { value: 'critical', key: 'critical' },
    { value: 'high', key: 'high' },
    { value: 'medium', key: 'medium' },
    { value: 'low', key: 'low' },
];

const textareaClass =
    'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function RunsCreate({
    project,
    suites,
    milestones,
    members,
    currentUserId,
}: {
    project: Project;
    suites: Suite[];
    milestones: Milestone[];
    members: Member[];
    currentUserId: number;
}) {
    const t = useTrans();

    const { data, setData, post, processing, errors, transform } =
        useForm<RunForm>({
            name: '',
            description: '',
            refs: '',
            suite_id: suites.length === 1 ? String(suites[0].id) : '',
            milestone_id: '',
            assigned_to: String(currentUserId),
            start_on: '',
            end_on: '',
            include_all: true,
            case_ids: [],
            filter_priority: '',
            filter_type: '',
            add_and_create: false,
        });

    const [mode, setMode] = useState<SelectionMode>('all');
    const [sections, setSections] = useState<SectionNode[]>([]);

    // Auto-fill name from selected suite when name is still empty.
    const nameTouched = useRef(false);

    useEffect(() => {
        if (mode !== 'specific' || !data.suite_id) {
            return;
        }

        let cancelled = false;

        fetch(`/api/suites/${data.suite_id}/sections-with-cases`)
            .then((r) => r.json())
            .then((d) => {
                if (!cancelled) {
                    setSections(d as SectionNode[]);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSections([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [mode, data.suite_id]);

    function onSuiteChange(value: string) {
        const suiteId = value === 'none' ? '' : value;
        setData('suite_id', suiteId);

        if (!nameTouched.current && suiteId) {
            const suite = suites.find((s) => String(s.id) === suiteId);
            if (suite) {
                setData('name', suite.name);
            }
        }
    }

    function toggleCase(id: number) {
        setData(
            'case_ids',
            data.case_ids.includes(id)
                ? data.case_ids.filter((c) => c !== id)
                : [...data.case_ids, id],
        );
    }

    const addAndCreateRef = useRef(false);

    function submit(event?: React.FormEvent) {
        event?.preventDefault();

        transform((current) => ({
            ...current,
            add_and_create: addAndCreateRef.current,
            include_all: mode !== 'specific',
            case_ids: mode === 'specific' ? current.case_ids : [],
            filter_priority: mode === 'dynamic' ? current.filter_priority : '',
            filter_type: mode === 'dynamic' ? current.filter_type : '',
        }));

        post(`/projects/${project.id}/runs`);
    }

    return (
        <>
            <Head title={t('app.runs.create')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <h1 className="text-2xl font-semibold">{t('app.runs.create')}</h1>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>{t('app.runs.create')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-6">
                            {/* Name */}
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('app.runs.fields.name')} *
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => {
                                        nameTouched.current = true;
                                        setData('name', e.target.value);
                                    }}
                                    placeholder={t('app.runs.fields.name_placeholder')}
                                    autoFocus
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* References */}
                            <div className="grid gap-2">
                                <Label htmlFor="refs">
                                    {t('app.runs.fields.refs')}
                                </Label>
                                <Input
                                    id="refs"
                                    value={data.refs}
                                    onChange={(e) =>
                                        setData('refs', e.target.value)
                                    }
                                    placeholder={t('app.runs.fields.refs_placeholder')}
                                />
                            </div>

                            {/* Suite + Milestone */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="suite">
                                        {t('app.navigation.suites')}
                                    </Label>
                                    <Select
                                        value={data.suite_id || 'none'}
                                        onValueChange={onSuiteChange}
                                    >
                                        <SelectTrigger id="suite">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">—</SelectItem>
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
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="milestone">
                                        {t('app.runs.fields.milestone')}
                                    </Label>
                                    <Select
                                        value={data.milestone_id || 'none'}
                                        onValueChange={(v) =>
                                            setData(
                                                'milestone_id',
                                                v === 'none' ? '' : v,
                                            )
                                        }
                                    >
                                        <SelectTrigger id="milestone">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">—</SelectItem>
                                            {milestones.map((m) => (
                                                <SelectItem
                                                    key={m.id}
                                                    value={String(m.id)}
                                                >
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="assigned_to">
                                        {t('app.runs.fields.assigned_to')}
                                    </Label>
                                    <Select
                                        value={data.assigned_to || 'none'}
                                        onValueChange={(v) =>
                                            setData(
                                                'assigned_to',
                                                v === 'none' ? '' : v,
                                            )
                                        }
                                    >
                                        <SelectTrigger id="assigned_to">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">—</SelectItem>
                                            <SelectItem
                                                value={String(currentUserId)}
                                            >
                                                {t('app.runs.fields.assign_me')}
                                            </SelectItem>
                                            {members
                                                .filter(
                                                    (m) =>
                                                        m.id !== currentUserId,
                                                )
                                                .map((m) => (
                                                    <SelectItem
                                                        key={m.id}
                                                        value={String(m.id)}
                                                    >
                                                        {m.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="start_on">
                                            {t('app.runs.fields.start_on')}
                                        </Label>
                                        <Input
                                            id="start_on"
                                            type="date"
                                            value={data.start_on}
                                            onChange={(e) =>
                                                setData(
                                                    'start_on',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="end_on">
                                            {t('app.runs.fields.end_on')}
                                        </Label>
                                        <Input
                                            id="end_on"
                                            type="date"
                                            value={data.end_on}
                                            onChange={(e) =>
                                                setData('end_on', e.target.value)
                                            }
                                        />
                                        {errors.end_on && (
                                            <p className="text-sm text-destructive">
                                                {errors.end_on}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    {t('app.runs.fields.description')}
                                </Label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    rows={3}
                                    className={textareaClass}
                                />
                            </div>

                            {/* Case selection mode */}
                            <div className="grid gap-3">
                                <Label>{t('app.runs.fields.case_selection')}</Label>
                                <div className="grid gap-2">
                                    {(
                                        [
                                            'all',
                                            'specific',
                                            'dynamic',
                                        ] as SelectionMode[]
                                    ).map((m) => (
                                        <label
                                            key={m}
                                            className="flex cursor-pointer items-center gap-2 text-sm"
                                        >
                                            <input
                                                type="radio"
                                                name="selection_mode"
                                                checked={mode === m}
                                                onChange={() => setMode(m)}
                                                className="size-4 accent-primary"
                                            />
                                            {t(`app.runs.selection.${m}`)}
                                        </label>
                                    ))}
                                </div>

                                {/* Specific cases tree */}
                                {mode === 'specific' && (
                                    <div className="max-h-72 overflow-y-auto rounded-md border p-2">
                                        {!data.suite_id ? (
                                            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                                                {t('app.runs.selection.pick_suite')}
                                            </p>
                                        ) : sections.length === 0 ? (
                                            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                                                {t('app.test_cases.empty')}
                                            </p>
                                        ) : (
                                            sections.map((section) => (
                                                <SectionTree
                                                    key={section.id}
                                                    node={section}
                                                    selected={data.case_ids}
                                                    onToggle={toggleCase}
                                                />
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Dynamic filters */}
                                {mode === 'dynamic' && (
                                    <div className="grid gap-4 rounded-md border p-3 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="filter_priority">
                                                {t('app.test_cases.fields.priority')}
                                            </Label>
                                            <Select
                                                value={
                                                    data.filter_priority ||
                                                    'none'
                                                }
                                                onValueChange={(v) =>
                                                    setData(
                                                        'filter_priority',
                                                        v === 'none' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger id="filter_priority">
                                                    <SelectValue placeholder="—" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        —
                                                    </SelectItem>
                                                    {PRIORITY_OPTIONS.map(
                                                        (opt) => (
                                                            <SelectItem
                                                                key={opt.value}
                                                                value={opt.value}
                                                            >
                                                                {t(
                                                                    `app.test_cases.priorities.${opt.key}`,
                                                                )}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="filter_type">
                                                {t('app.test_cases.fields.type')}
                                            </Label>
                                            <Select
                                                value={
                                                    data.filter_type || 'none'
                                                }
                                                onValueChange={(v) =>
                                                    setData(
                                                        'filter_type',
                                                        v === 'none' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger id="filter_type">
                                                    <SelectValue placeholder="—" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        —
                                                    </SelectItem>
                                                    {TEST_CASE_TYPES.map(
                                                        (type) => (
                                                            <SelectItem
                                                                key={type}
                                                                value={type}
                                                                className="capitalize"
                                                            >
                                                                {type}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" disabled={processing}>
                                    {t('app.runs.create')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={processing}
                                    onClick={() => {
                                        addAndCreateRef.current = true;
                                        submit();
                                    }}
                                >
                                    {t('app.runs.add_and_create')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={`/projects/${project.id}/runs`}>
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

function SectionTree({
    node,
    selected,
    onToggle,
}: {
    node: SectionNode;
    selected: number[];
    onToggle: (id: number) => void;
}) {
    return (
        <div className="mb-1">
            <p className="px-1 py-1 text-xs font-semibold text-muted-foreground">
                {node.name}
            </p>
            <div className="ml-3 grid gap-0.5">
                {(node.test_cases ?? []).map((c) => (
                    <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted/50"
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(c.id)}
                            onChange={() => onToggle(c.id)}
                            className="size-4 accent-primary"
                        />
                        <span className="truncate">{c.title}</span>
                    </label>
                ))}
                {(node.children ?? []).map((child) => (
                    <SectionTree
                        key={child.id}
                        node={child}
                        selected={selected}
                        onToggle={onToggle}
                    />
                ))}
            </div>
        </div>
    );
}

RunsCreate.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Runs', href: '' },
    ],
};
