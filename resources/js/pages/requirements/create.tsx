import { Head, Link, useForm } from '@inertiajs/react';
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
import type { RequirementFolder } from '@/types/requirement';

type FormData = {
    title: string;
    description: string;
    type: string;
    priority: string;
    status: string;
    folder_id: string;
    assigned_to: string;
    external_ref: string;
    tags: string;
};

export default function RequirementCreate({
    project,
    folders,
    members,
    types,
    priorities,
    statuses,
}: {
    project: Project;
    folders: RequirementFolder[];
    members: { id: number; name: string }[];
    types: string[];
    priorities: string[];
    statuses: string[];
}) {
    const t = useTrans();

    const { data, setData, post, processing, errors } = useForm<FormData>({
        title:        '',
        description:  '',
        type:         '',
        priority:     '',
        status:       'draft',
        folder_id:    '',
        assigned_to:  '',
        external_ref: '',
        tags:         '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(`/projects/${project.id}/requirements`);
    }

    return (
        <>
            <Head title={t('app.requirements.create')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold">{t('app.requirements.create')}</h1>
                    <Button variant="outline" asChild>
                        <Link href={`/projects/${project.id}/requirements`}>
                            {t('app.common.cancel')}
                        </Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('app.requirements.fields.details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">

                            <div className="grid gap-2">
                                <Label htmlFor="title">
                                    {t('app.requirements.fields.title')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    autoFocus
                                />
                                {errors.title && (
                                    <p className="text-xs text-destructive">{errors.title}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    {t('app.requirements.fields.description')}
                                </Label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={5}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="external_ref">
                                    {t('app.requirements.fields.external_ref')}
                                </Label>
                                <Input
                                    id="external_ref"
                                    value={data.external_ref}
                                    onChange={(e) => setData('external_ref', e.target.value)}
                                    placeholder={t('app.requirements.placeholders.external_ref')}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="tags">
                                    {t('app.requirements.fields.tags')}
                                </Label>
                                <Input
                                    id="tags"
                                    value={data.tags}
                                    onChange={(e) => setData('tags', e.target.value)}
                                    placeholder={t('app.requirements.placeholders.tags')}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 self-start">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {t('app.requirements.fields.properties')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4">

                                <div className="grid gap-2">
                                    <Label>{t('app.requirements.fields.type')}</Label>
                                    <Select
                                        value={data.type || 'none'}
                                        onValueChange={(v) => setData('type', v === 'none' ? '' : v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('app.requirements.placeholders.type')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">—</SelectItem>
                                            {types.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {t(`app.requirements.types.${type}`)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>{t('app.requirements.fields.priority')}</Label>
                                    <Select
                                        value={data.priority || 'none'}
                                        onValueChange={(v) => setData('priority', v === 'none' ? '' : v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('app.requirements.placeholders.priority')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">—</SelectItem>
                                            {priorities.map((priority) => (
                                                <SelectItem key={priority} value={priority}>
                                                    {t(`app.requirements.priorities.${priority}`)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>{t('app.requirements.fields.status')}</Label>
                                    <Select
                                        value={data.status || 'none'}
                                        onValueChange={(v) => setData('status', v === 'none' ? '' : v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('app.requirements.placeholders.status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">—</SelectItem>
                                            {statuses.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {t(`app.requirements.statuses.${status}`)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>{t('app.requirements.fields.folder')}</Label>
                                    <Select
                                        value={data.folder_id || 'none'}
                                        onValueChange={(v) => setData('folder_id', v === 'none' ? '' : v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('app.requirements.placeholders.folder_none')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                {t('app.requirements.placeholders.folder_none')}
                                            </SelectItem>
                                            {folders.map((f) => (
                                                <SelectItem key={f.id} value={String(f.id)}>
                                                    {f.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label>{t('app.requirements.fields.assigned_to')}</Label>
                                    <Select
                                        value={data.assigned_to || 'none'}
                                        onValueChange={(v) => setData('assigned_to', v === 'none' ? '' : v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('app.requirements.placeholders.unassigned')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                {t('app.requirements.placeholders.unassigned')}
                                            </SelectItem>
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={String(m.id)}>
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                            </CardContent>
                        </Card>

                        <Button type="submit" disabled={processing} className="w-full">
                            {t('app.requirements.actions.create')}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

RequirementCreate.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Requirements' },
    ],
};