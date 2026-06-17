import { Head, Link, router, useForm } from '@inertiajs/react';
import { Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project, ProjectMember, ProjectRole } from '@/types/project';

type AvailableUser = { id: number; name: string; email: string };

// ── Role badge colours ────────────────────────────────────────────────────────

const ROLE_COLOURS: Record<ProjectRole, string> = {
    viewer:        'bg-slate-100 text-slate-600',
    tester:        'bg-blue-100 text-blue-700',
    author:        'bg-violet-100 text-violet-700',
    lead:          'bg-orange-100 text-orange-700',
    project_admin: 'bg-green-100 text-green-700',
};

function RoleBadge({ role }: { role: ProjectRole }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_COLOURS[role]}`}>
            {role.replace('_', ' ')}
        </span>
    );
}

// ── General tab ───────────────────────────────────────────────────────────────

function GeneralTab({ project }: { project: Project }) {
    const t = useTrans();

    const { data, setData, patch, processing, errors } = useForm({
        name:              project.name,
        description:       project.description ?? '',
        announcement:      project.announcement ?? '',
        show_announcement: project.show_announcement,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(`/projects/${project.id}/settings/general`);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t('settings.general')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('projects.fields.name')}</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">{t('projects.fields.description')}</Label>
                        <textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={3}
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="announcement">{t('projects.fields.announcement')}</Label>
                        <textarea
                            id="announcement"
                            value={data.announcement}
                            onChange={(e) => setData('announcement', e.target.value)}
                            rows={2}
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            id="show_announcement"
                            type="checkbox"
                            checked={data.show_announcement}
                            onChange={(e) => setData('show_announcement', e.target.checked)}
                            className="size-4 rounded border-input"
                        />
                        <Label htmlFor="show_announcement" className="cursor-pointer">
                            {t('projects.fields.show_announcement')}
                        </Label>
                    </div>

                    <div>
                        <Button type="submit" disabled={processing}>
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({
    project,
    available,
    roles,
}: {
    project: Project;
    available: AvailableUser[];
    roles: ProjectRole[];
}) {
    const t = useTrans();

    const addForm = useForm({ user_id: '', role: 'tester' as ProjectRole });

    function submitAdd(e: React.FormEvent) {
        e.preventDefault();
        addForm.patch(`/projects/${project.id}/settings/members`, {
            onSuccess: () => addForm.reset(),
        });
    }

    function changeRole(member: ProjectMember, role: ProjectRole) {
        router.patch(`/projects/${project.id}/settings/members/${member.id}/role`, { role });
    }

    function removeMember(member: ProjectMember) {
        if (!window.confirm(t('common.confirm_delete'))) return;
        router.delete(`/projects/${project.id}/settings/members/${member.id}`);
    }

    return (
        <div className="grid gap-4">
            {/* Current members */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('settings.members_current')}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                    {(project.members ?? []).map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                            <div className="min-w-0">
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <Select
                                    value={member.pivot.role}
                                    onValueChange={(v) => changeRole(member, v as ProjectRole)}
                                >
                                    <SelectTrigger className="h-7 w-36 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((r) => (
                                            <SelectItem key={r} value={r} className="text-xs capitalize">
                                                {r.replace('_', ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-destructive hover:text-destructive"
                                    onClick={() => removeMember(member)}
                                >
                                    <UserMinus className="size-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Add member */}
            {available.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('settings.members_add')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitAdd} className="flex flex-wrap items-end gap-3">
                            <div className="grid min-w-48 flex-1 gap-2">
                                <Label>{t('settings.user')}</Label>
                                <Select
                                    value={addForm.data.user_id || 'none'}
                                    onValueChange={(v) => addForm.setData('user_id', v === 'none' ? '' : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('settings.select_user')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">—</SelectItem>
                                        {available.map((u) => (
                                            <SelectItem key={u.id} value={String(u.id)}>
                                                {u.name} <span className="text-muted-foreground">({u.email})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>{t('settings.role')}</Label>
                                <Select
                                    value={addForm.data.role}
                                    onValueChange={(v) => addForm.setData('role', v as ProjectRole)}
                                >
                                    <SelectTrigger className="w-36">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((r) => (
                                            <SelectItem key={r} value={r} className="capitalize">
                                                {r.replace('_', ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="submit"
                                disabled={addForm.processing || !addForm.data.user_id}
                            >
                                <UserPlus className="size-4" />
                                {t('settings.members_add')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ── Danger tab ────────────────────────────────────────────────────────────────

function DangerTab({ project }: { project: Project }) {
    const t = useTrans();
    const [confirmName, setConfirmName] = useState('');

    function toggleComplete() {
        if (project.is_completed) {
            router.patch(`/projects/${project.id}`, { is_completed: false });
        } else {
            router.patch(`/projects/${project.id}`, { is_completed: true });
        }
    }

    function deleteProject() {
        if (confirmName !== project.name) return;
        router.delete(`/projects/${project.id}`);
    }

    return (
        <div className="grid gap-4">
            {/* Complete / Reactivate */}
            <Card className="border-orange-200">
                <CardHeader>
                    <CardTitle className="text-base text-orange-700">
                        {project.is_completed
                            ? t('settings.danger.reactivate_title')
                            : t('settings.danger.complete_title')
                        }
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        {project.is_completed
                            ? t('settings.danger.reactivate_desc')
                            : t('settings.danger.complete_desc')
                        }
                    </p>
                    <Button variant="outline" onClick={toggleComplete} className="shrink-0">
                        {project.is_completed
                            ? t('settings.danger.reactivate')
                            : t('settings.danger.complete')
                        }
                    </Button>
                </CardContent>
            </Card>

            {/* Delete */}
            <Card className="border-destructive/40">
                <CardHeader>
                    <CardTitle className="text-base text-destructive">
                        {t('settings.danger.delete_title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <p className="text-sm text-muted-foreground">
                        {t('settings.danger.delete_desc')}
                    </p>
                    <div className="grid gap-2">
                        <Label className="text-sm">
                            {t('settings.danger.confirm_label')}
                            {' '}
                            <strong>{project.name}</strong>
                        </Label>
                        <Input
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder={project.name}
                        />
                    </div>
                    <div>
                        <Button
                            variant="destructive"
                            disabled={confirmName !== project.name}
                            onClick={deleteProject}
                        >
                            <Trash2 className="size-4" />
                            {t('settings.danger.delete_confirm')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProjectSettings({
    project,
    available,
    roles,
}: {
    project: Project;
    available: AvailableUser[];
    roles: ProjectRole[];
}) {
    const t = useTrans();

    return (
        <>
            <Head title={`${project.name} — ${t('settings.title')}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
                        <p className="text-sm text-muted-foreground">{project.name}</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={`/projects/${project.id}`}>
                            ← {t('common.back')}
                        </Link>
                    </Button>
                </div>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList>
                        <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
                        <TabsTrigger value="members">{t('settings.members')}</TabsTrigger>
                        <TabsTrigger value="danger">{t('settings.danger.tab')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="mt-4 max-w-2xl">
                        <GeneralTab project={project} />
                    </TabsContent>

                    <TabsContent value="members" className="mt-4 max-w-3xl">
                        <MembersTab project={project} available={available} roles={roles} />
                    </TabsContent>

                    <TabsContent value="danger" className="mt-4 max-w-2xl">
                        <DangerTab project={project} />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

ProjectSettings.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Settings', href: '' },
    ],
};