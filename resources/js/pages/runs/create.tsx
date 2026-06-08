import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project } from '@/types';
import type { Milestone } from '@/types/project';

type Suite = { id: number; name: string };
type Member = { id: number; name: string };

type RunForm = {
    name: string;
    description: string;
    refs: string;
    suite_id: string;
    milestone_id: string;
    assigned_to: string;
    include_all: boolean;
    case_ids: number[];
};

export default function RunsCreate({
    project,
    suites,
    milestones,
    members,
}: {
    project: Project;
    suites: Suite[];
    milestones: Milestone[];
    members: Member[];
}) {
    const t = useTrans();

    const { data, setData, post, processing, errors } = useForm<RunForm>({
        name:         '',
        description:  '',
        refs:         '',
        suite_id:     suites.length === 1 ? String(suites[0].id) : '',
        milestone_id: '',
        assigned_to:  '',
        include_all:  true,
        case_ids:     [],
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
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
                                <Label htmlFor="name">{t('app.runs.fields.name')}</Label>
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
                                <Label htmlFor="description">{t('app.runs.fields.description')}</Label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                            </div>

                            {/* Suite + Milestone */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="suite">{t('app.navigation.suites')}</Label>
                                    <Select
                                        value={data.suite_id || 'none'}
                                        onValueChange={(v) => setData('suite_id', v === 'none' ? '' : v)}
                                    >
                                        <SelectTrigger id="suite">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">—</SelectItem>
                                            {suites.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="milestone">{t('app.runs.fields.milestone')}</Label>
                                    <Select
                                        value={data.milestone_id || 'none'}
                                        onValueChange={(v) => setData('milestone_id', v === 'none' ? '' : v)}
                                    >
                                        <SelectTrigger id="milestone">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">—</SelectItem>
                                            {milestones.map((m) => (
                                                <SelectItem key={m.id} value={String(m.id)}>
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="assigned_to">{t('app.runs.fields.assigned_to')}</Label>
                                    <Select
                                        value={data.assigned_to || 'none'}
                                        onValueChange={(v) => setData('assigned_to', v === 'none' ? '' : v)}
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

                                <div className="grid gap-2">
                                    <Label htmlFor="refs">{t('app.runs.fields.refs')}</Label>
                                    <Input
                                        id="refs"
                                        value={data.refs}
                                        onChange={(e) => setData('refs', e.target.value)}
                                        placeholder="e.g. JIRA-123"
                                    />
                                </div>
                            </div>

                            {/* Include All toggle */}
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="include_all"
                                    checked={data.include_all}
                                    onCheckedChange={(v) => setData('include_all', Boolean(v))}
                                />
                                <Label htmlFor="include_all" className="cursor-pointer">
                                    {t('app.runs.fields.include_all')}
                                </Label>
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    {t('app.common.create')}
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

RunsCreate.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Runs', href: '' },
    ],
};