import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import type { Project } from '@/types';
import type { TestPlan } from '@/types/test-plan';

type MilestoneOption = { id: number; name: string };
type SuiteOption = { id: number; name: string };
type Member = { id: number; name: string };

type PlanEntry = {
    suite_id: number;
    include_all: boolean;
    assigned_to: string;
    refs: string;
    description: string;
    start_on: string;
    end_on: string;
};

type PlanForm = {
    name: string;
    description: string;
    refs: string;
    milestone_id: string;
    start_on: string;
    end_on: string;
    entries: PlanEntry[];
};

const textareaClass =
    'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function PlanForm({
    project,
    plan,
    milestones,
    suites = [],
    members = [],
}: {
    project: Project;
    plan: TestPlan | null;
    milestones: MilestoneOption[];
    suites?: SuiteOption[];
    members?: Member[];
}) {
    const t = useTrans();
    const isEdit = plan !== null;

    const { data, setData, post, put, processing, errors } = useForm<PlanForm>({
        name: plan?.name ?? '',
        description: plan?.description ?? '',
        refs: plan?.refs ?? '',
        milestone_id: plan?.milestone_id ? String(plan.milestone_id) : '',
        start_on: plan?.start_on ?? '',
        end_on: plan?.end_on ?? '',
        entries: [],
    });

    const [addSuiteId, setAddSuiteId] = useState<string>('');
    const [expanded, setExpanded] = useState<number | null>(null);

    function addEntry() {
        if (!addSuiteId) {
            return;
        }

        setData('entries', [
            ...data.entries,
            {
                suite_id: Number(addSuiteId),
                include_all: true,
                assigned_to: '',
                refs: '',
                description: '',
                start_on: '',
                end_on: '',
            },
        ]);
        setAddSuiteId('');
    }

    function updateEntry<K extends keyof PlanEntry>(
        index: number,
        key: K,
        value: PlanEntry[K],
    ) {
        const next = [...data.entries];
        next[index] = { ...next[index], [key]: value };
        setData('entries', next);
    }

    function removeEntry(index: number) {
        setData(
            'entries',
            data.entries.filter((_, i) => i !== index),
        );
    }

    function suiteName(id: number): string {
        return suites.find((s) => s.id === id)?.name ?? `#${id}`;
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();

        if (isEdit) {
            put(`/plans/${plan!.id}`);
        } else {
            post(`/projects/${project.id}/plans`);
        }
    }

    const title = isEdit ? t('app.plans.edit') : t('app.plans.create');

    return (
        <>
            <Head title={title} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <h1 className="text-2xl font-semibold">{title}</h1>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-6">
                            {/* Name */}
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('app.plans.fields.name')} *
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    autoFocus
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    {t('app.plans.fields.description')}
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

                            {/* Milestone + Refs */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="milestone_id">
                                        {t('app.plans.fields.milestone')}
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
                                        <SelectTrigger id="milestone_id">
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
                                    <Label htmlFor="refs">
                                        {t('app.plans.fields.refs')}
                                    </Label>
                                    <Input
                                        id="refs"
                                        value={data.refs}
                                        onChange={(e) =>
                                            setData('refs', e.target.value)
                                        }
                                        placeholder="e.g. JIRA-300"
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="start_on">
                                        {t('app.plans.fields.start_on')}
                                    </Label>
                                    <Input
                                        id="start_on"
                                        type="date"
                                        value={data.start_on}
                                        onChange={(e) =>
                                            setData('start_on', e.target.value)
                                        }
                                    />
                                    {errors.start_on && (
                                        <p className="text-sm text-destructive">
                                            {errors.start_on}
                                        </p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="end_on">
                                        {t('app.plans.fields.end_on')}
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

                            {/* Suite entries (create only) */}
                            {!isEdit && (
                                <div className="grid gap-3">
                                    <Label>{t('app.plans.entries.title')}</Label>

                                    {data.entries.length === 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            {t('app.plans.entries.empty')}
                                        </p>
                                    )}

                                    {data.entries.map((entry, index) => (
                                        <div
                                            key={index}
                                            className="rounded-md border border-border"
                                        >
                                            <div className="flex items-center justify-between gap-2 px-3 py-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpanded(
                                                            expanded === index
                                                                ? null
                                                                : index,
                                                        )
                                                    }
                                                    className="flex items-center gap-2 text-sm font-medium"
                                                >
                                                    {expanded === index ? (
                                                        <ChevronDown className="size-4" />
                                                    ) : (
                                                        <ChevronRight className="size-4" />
                                                    )}
                                                    {suiteName(entry.suite_id)}
                                                </button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        removeEntry(index)
                                                    }
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>

                                            {expanded === index && (
                                                <div className="grid gap-3 border-t border-border p-3">
                                                    {/* Inclusion mode */}
                                                    <div className="flex flex-wrap gap-4 text-sm">
                                                        <label className="flex cursor-pointer items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name={`include_${index}`}
                                                                checked={
                                                                    entry.include_all
                                                                }
                                                                onChange={() =>
                                                                    updateEntry(
                                                                        index,
                                                                        'include_all',
                                                                        true,
                                                                    )
                                                                }
                                                                className="size-4 accent-primary"
                                                            />
                                                            {t(
                                                                'app.plans.entries.all_cases',
                                                            )}
                                                        </label>
                                                        <label className="flex cursor-pointer items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                name={`include_${index}`}
                                                                checked={
                                                                    !entry.include_all
                                                                }
                                                                onChange={() =>
                                                                    updateEntry(
                                                                        index,
                                                                        'include_all',
                                                                        false,
                                                                    )
                                                                }
                                                                className="size-4 accent-primary"
                                                            />
                                                            {t(
                                                                'app.plans.entries.select_cases',
                                                            )}
                                                        </label>
                                                    </div>

                                                    {/* Assigned To */}
                                                    <div className="grid gap-2">
                                                        <Label>
                                                            {t(
                                                                'app.runs.fields.assigned_to',
                                                            )}
                                                        </Label>
                                                        <Select
                                                            value={
                                                                entry.assigned_to ||
                                                                'none'
                                                            }
                                                            onValueChange={(v) =>
                                                                updateEntry(
                                                                    index,
                                                                    'assigned_to',
                                                                    v === 'none'
                                                                        ? ''
                                                                        : v,
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue
                                                                    placeholder={t(
                                                                        'app.plans.entries.nobody',
                                                                    )}
                                                                />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">
                                                                    {t(
                                                                        'app.plans.entries.nobody',
                                                                    )}
                                                                </SelectItem>
                                                                {members.map(
                                                                    (m) => (
                                                                        <SelectItem
                                                                            key={
                                                                                m.id
                                                                            }
                                                                            value={String(
                                                                                m.id,
                                                                            )}
                                                                        >
                                                                            {
                                                                                m.name
                                                                            }
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* References */}
                                                    <div className="grid gap-2">
                                                        <Label>
                                                            {t(
                                                                'app.plans.fields.refs',
                                                            )}
                                                        </Label>
                                                        <Input
                                                            value={entry.refs}
                                                            onChange={(e) =>
                                                                updateEntry(
                                                                    index,
                                                                    'refs',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    {/* Description */}
                                                    <div className="grid gap-2">
                                                        <Label>
                                                            {t(
                                                                'app.plans.fields.description',
                                                            )}
                                                        </Label>
                                                        <textarea
                                                            value={
                                                                entry.description
                                                            }
                                                            onChange={(e) =>
                                                                updateEntry(
                                                                    index,
                                                                    'description',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            rows={2}
                                                            className={
                                                                textareaClass
                                                            }
                                                        />
                                                    </div>

                                                    {/* Dates */}
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                        <div className="grid gap-2">
                                                            <Label>
                                                                {t(
                                                                    'app.plans.fields.start_on',
                                                                )}
                                                            </Label>
                                                            <Input
                                                                type="date"
                                                                value={
                                                                    entry.start_on
                                                                }
                                                                onChange={(e) =>
                                                                    updateEntry(
                                                                        index,
                                                                        'start_on',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label>
                                                                {t(
                                                                    'app.plans.fields.end_on',
                                                                )}
                                                            </Label>
                                                            <Input
                                                                type="date"
                                                                value={
                                                                    entry.end_on
                                                                }
                                                                onChange={(e) =>
                                                                    updateEntry(
                                                                        index,
                                                                        'end_on',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add suite control */}
                                    <div className="flex items-end gap-2">
                                        <div className="grid flex-1 gap-2">
                                            <Select
                                                value={addSuiteId || 'none'}
                                                onValueChange={(v) =>
                                                    setAddSuiteId(
                                                        v === 'none' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={t(
                                                            'app.plans.entries.pick_suite',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        {t(
                                                            'app.plans.entries.pick_suite',
                                                        )}
                                                    </SelectItem>
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
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={addEntry}
                                            disabled={!addSuiteId}
                                        >
                                            <Plus className="size-4" />
                                            {t('app.plans.entries.add_suite')}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    {isEdit
                                        ? t('app.common.save')
                                        : t('app.common.create')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link
                                        href={
                                            isEdit
                                                ? `/plans/${plan!.id}`
                                                : `/projects/${project.id}/plans`
                                        }
                                    >
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

PlanForm.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Plans', href: '' },
    ],
};
