import { Head, Link, useForm } from '@inertiajs/react';
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
import type { Milestone, MilestoneStatus } from '@/types/milestone';

type ParentOption = { id: number; name: string };

type MilestoneForm = {
    name: string;
    description: string;
    refs: string;
    status: MilestoneStatus;
    start_on: string;
    due_on: string;
    parent_id: string;
};

export default function MilestoneForm({
    project,
    milestone,
    parents,
    statuses,
}: {
    project: Project;
    milestone: Milestone | null;
    parents: ParentOption[];
    statuses: string[];
}) {
    const t    = useTrans();
    const isEdit = milestone !== null;

    const { data, setData, post, put, processing, errors } = useForm<MilestoneForm>({
        name:        milestone?.name        ?? '',
        description: milestone?.description ?? '',
        refs:        milestone?.refs        ?? '',
        status:      (milestone?.status as MilestoneStatus) ?? 'upcoming',
        start_on:    milestone?.start_on    ?? '',
        due_on:      milestone?.due_on      ?? '',
        parent_id:   milestone?.parent_id   ? String(milestone.parent_id) : '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit) {
            put(`/milestones/${milestone!.id}`);
        } else {
            post(`/projects/${project.id}/milestones`);
        }
    }

    const title = isEdit ? t('milestones.edit') : t('milestones.create');

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
                                <Label htmlFor="name">{t('milestones.fields.name')}</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    autoFocus
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="grid gap-2">
                                <Label htmlFor="description">{t('milestones.fields.description')}</Label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                            </div>

                            {/* Status + Parent */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="status">{t('milestones.fields.status')}</Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(v) => setData('status', v as MilestoneStatus)}
                                    >
                                        <SelectTrigger id="status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.map((s) => (
                                                <SelectItem key={s} value={s} className="capitalize">
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.status && (
                                        <p className="text-sm text-destructive">{errors.status}</p>
                                    )}
                                </div>

                                {parents.length > 0 && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="parent_id">{t('milestones.fields.parent')}</Label>
                                        <Select
                                            value={data.parent_id || 'none'}
                                            onValueChange={(v) => setData('parent_id', v === 'none' ? '' : v)}
                                        >
                                            <SelectTrigger id="parent_id">
                                                <SelectValue placeholder="—" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">—</SelectItem>
                                                {parents.map((p) => (
                                                    <SelectItem key={p.id} value={String(p.id)}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* Dates */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="start_on">{t('milestones.fields.start_on')}</Label>
                                    <Input
                                        id="start_on"
                                        type="date"
                                        value={data.start_on}
                                        onChange={(e) => setData('start_on', e.target.value)}
                                    />
                                    {errors.start_on && (
                                        <p className="text-sm text-destructive">{errors.start_on}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="due_on">{t('milestones.fields.due_on')}</Label>
                                    <Input
                                        id="due_on"
                                        type="date"
                                        value={data.due_on}
                                        onChange={(e) => setData('due_on', e.target.value)}
                                    />
                                    {errors.due_on && (
                                        <p className="text-sm text-destructive">{errors.due_on}</p>
                                    )}
                                </div>
                            </div>

                            {/* Refs */}
                            <div className="grid gap-2">
                                <Label htmlFor="refs">{t('milestones.fields.refs')}</Label>
                                <Input
                                    id="refs"
                                    value={data.refs}
                                    onChange={(e) => setData('refs', e.target.value)}
                                    placeholder="e.g. JIRA-200"
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    {isEdit ? t('common.save') : t('common.create')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={isEdit
                                        ? `/milestones/${milestone!.id}`
                                        : `/projects/${project.id}/milestones`
                                    }>
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

MilestoneForm.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Milestones', href: '' },
    ],
};