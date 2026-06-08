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
import type { TestPlan } from '@/types/test-plan';

type MilestoneOption = { id: number; name: string };

type PlanForm = {
    name: string;
    description: string;
    refs: string;
    milestone_id: string;
    start_on: string;
    end_on: string;
};

export default function PlanForm({
    project,
    plan,
    milestones,
}: {
    project: Project;
    plan: TestPlan | null;
    milestones: MilestoneOption[];
}) {
    const t      = useTrans();
    const isEdit = plan !== null;

    const { data, setData, post, put, processing, errors } = useForm<PlanForm>({
        name:         plan?.name         ?? '',
        description:  plan?.description  ?? '',
        refs:         plan?.refs         ?? '',
        milestone_id: plan?.milestone_id ? String(plan.milestone_id) : '',
        start_on:     plan?.start_on     ?? '',
        end_on:       plan?.end_on       ?? '',
    });

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
                                <Label htmlFor="name">{t('app.plans.fields.name')}</Label>
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
                                <Label htmlFor="description">{t('app.plans.fields.description')}</Label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                            </div>

                            {/* Milestone + Refs */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="milestone_id">{t('app.plans.fields.milestone')}</Label>
                                    <Select
                                        value={data.milestone_id || 'none'}
                                        onValueChange={(v) => setData('milestone_id', v === 'none' ? '' : v)}
                                    >
                                        <SelectTrigger id="milestone_id">
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
                                    <Label htmlFor="refs">{t('app.plans.fields.refs')}</Label>
                                    <Input
                                        id="refs"
                                        value={data.refs}
                                        onChange={(e) => setData('refs', e.target.value)}
                                        placeholder="e.g. JIRA-300"
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="start_on">{t('app.plans.fields.start_on')}</Label>
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
                                    <Label htmlFor="end_on">{t('app.plans.fields.end_on')}</Label>
                                    <Input
                                        id="end_on"
                                        type="date"
                                        value={data.end_on}
                                        onChange={(e) => setData('end_on', e.target.value)}
                                    />
                                    {errors.end_on && (
                                        <p className="text-sm text-destructive">{errors.end_on}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    {isEdit ? t('app.common.save') : t('app.common.create')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={isEdit ? `/plans/${plan!.id}` : `/projects/${project.id}/plans`}>
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