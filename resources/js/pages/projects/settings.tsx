import { Head, Link, router, useForm } from '@inertiajs/react';
import { GripVertical, Plus, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
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

type ProjectFieldPivot = {
    is_required: boolean;
    display_order: number;
    default_value: string | null;
};

type ProjectField = {
    id: number;
    system_name: string;
    label: string;
    description: string | null;
    field_type: string;
    applies_to: 'cases' | 'results';
    is_global: boolean;
    pivot: ProjectFieldPivot | null;
};

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

// ── Custom Fields tab ─────────────────────────────────────────────────────────

function FieldsTab({ project, allFields }: { project: Project; allFields: ProjectField[] }) {
    const t = useTrans();

    const [local, setLocal] = useState(() => allFields.map((f) => ({ ...f })));

    const caseFields   = useMemo(() => local.filter((f) => f.applies_to === 'cases'),   [local]);
    const resultFields = useMemo(() => local.filter((f) => f.applies_to === 'results'), [local]);

    const visibleCaseFields = useMemo(
        () => caseFields.filter((f) => f.is_global || f.pivot !== null),
        [caseFields],
    );
    const visibleResultFields = useMemo(
        () => resultFields.filter((f) => f.is_global || f.pivot !== null),
        [resultFields],
    );

    const availableCaseFields = useMemo(
        () => caseFields.filter((f) => !f.is_global && f.pivot === null),
        [caseFields],
    );
    const availableResultFields = useMemo(
        () => resultFields.filter((f) => !f.is_global && f.pivot === null),
        [resultFields],
    );

    function attach(field: ProjectField, appliesTo: 'cases' | 'results') {
        const subset = appliesTo === 'cases' ? visibleCaseFields : visibleResultFields;
        const nextOrder = subset.length;

        router.post(`/projects/${project.id}/settings/fields`, {
            custom_field_id: field.id,
            is_required: false,
            display_order: nextOrder,
            default_value: null,
        }, { preserveScroll: true });

        setLocal((prev) => prev.map((f) => (
            f.id === field.id
                ? { ...f, pivot: { is_required: false, display_order: nextOrder, default_value: null } }
                : f
        )));
    }

    function toggleRequired(field: ProjectField) {
        // Allow toggling required for any active field (global or per-project),
        // creating/updating pivot as needed.
        if (!field.is_global && !field.pivot) return; // non-global must be attached first

        const isRequired = !(field.pivot?.is_required ?? false);

        const displayOrder = field.pivot?.display_order
            ?? (field.applies_to === 'cases'
                ? visibleCaseFields.length
                : visibleResultFields.length);

        router.post(`/projects/${project.id}/settings/fields`, {
            custom_field_id: field.id,
            is_required: isRequired,
            display_order: displayOrder,
            default_value: field.pivot?.default_value ?? null,
        }, { preserveScroll: true });

        setLocal((prev) => prev.map((f) => (
            f.id === field.id
                ? {
                    ...f,
                    pivot: {
                        ...(f.pivot ?? { display_order: displayOrder, default_value: null }),
                        is_required: isRequired,
                    },
                }
                : f
        )));
    }

    function detach(field: ProjectField) {
        if (field.is_global) return; // cannot detach global fields
        if (!window.confirm(t('common.confirm_delete'))) return;

        router.delete(`/projects/${project.id}/settings/fields/${field.id}`, { preserveScroll: true });

        setLocal((prev) => prev.map((f) => (
            f.id === field.id ? { ...f, pivot: null } : f
        )));
    }

    function handleReorder(appliesTo: 'cases' | 'results', direction: 'up' | 'down', field: ProjectField) {
        const subset = (appliesTo === 'cases' ? visibleCaseFields : visibleResultFields)
            .slice()
            .sort((a, b) => (a.pivot?.display_order ?? 0) - (b.pivot?.display_order ?? 0));

        const index = subset.findIndex((f) => f.id === field.id);
        if (index === -1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= subset.length) return;

        const reordered = [...subset];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(targetIndex, 0, moved);

        const payload = reordered.map((f, i) => ({
            custom_field_id: f.id,
            display_order: i,
            is_required: f.pivot?.is_required ?? false,
            default_value: f.pivot?.default_value ?? null,
        }));

        router.patch(`/projects/${project.id}/settings/fields/reorder`, { fields: payload }, { preserveScroll: true });

        setLocal((prev) => prev.map((f) => {
            const match = payload.find((p) => p.custom_field_id === f.id);
            if (!match) return f;
            return {
                ...f,
                pivot: {
                    ...(f.pivot ?? { is_required: match.is_required, default_value: match.default_value }),
                    display_order: match.display_order,
                    is_required: match.is_required,
                    default_value: match.default_value,
                },
            };
        }));
    }

    function renderFieldRow(field: ProjectField, appliesTo: 'cases' | 'results') {
        const isActive = field.is_global || field.pivot !== null;
        const required = field.pivot?.is_required ?? false;

        return (
            <tr key={field.id} className="border-b last:border-0">
                <td className="p-3 align-top text-xs text-muted-foreground">
                    {isActive && (
                        <div className="flex flex-col gap-0.5">
                            <button
                                type="button"
                                className="inline-flex items-center justify-center text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => handleReorder(appliesTo, 'up', field)}
                            >
                                <GripVertical className="size-3 rotate-180" />
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center justify-center text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => handleReorder(appliesTo, 'down', field)}
                            >
                                <GripVertical className="size-3" />
                            </button>
                        </div>
                    )}
                </td>
                <td className="p-3 align-top">
                    <div className="font-medium text-sm">{field.label}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                        {field.system_name}
                    </div>
                    {field.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{field.description}</p>
                    )}
                </td>
                <td className="p-3 align-top text-xs">
                    <Badge variant="outline" className="text-[11px]">
                        {field.field_type}
                    </Badge>
                </td>
                <td className="p-3 align-top text-xs">
                    {field.is_global ? (
                        <Badge variant="default" className="text-[11px]">Global</Badge>
                    ) : (
                        <Badge variant="secondary" className="text-[11px]">Per-project</Badge>
                    )}
                </td>
                <td className="p-3 align-top text-xs">
                    {isActive ? 'Visible' : 'Hidden'}
                </td>
                <td className="p-3 align-top text-xs">
                    <label className="inline-flex items-center gap-1 text-xs">
                        <input
                            type="checkbox"
                            checked={required}
                            disabled={!isActive}
                            onChange={() => toggleRequired(field)}
                            className="size-3 rounded border-input"
                        />
                        <span>Required</span>
                    </label>
                </td>
                <td className="p-3 align-top text-right text-xs">
                    {!field.is_global && isActive && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            onClick={() => detach(field)}
                        >
                            <Trash2 className="size-3.5" />
                        </Button>
                    )}
                </td>
            </tr>
        );
    }

    function renderTable(title: string, items: ProjectField[], appliesTo: 'cases' | 'results') {
        const visible = items.filter((f) => f.is_global || f.pivot !== null);

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                        <span>{title}</span>
                        {/* Attach dropdown: list available fields */}
                        {appliesTo === 'cases' && availableCaseFields.length > 0 && (
                            <Select
                                onValueChange={(v) => {
                                    const field = availableCaseFields.find((f) => String(f.id) === v);
                                    if (field) attach(field, appliesTo);
                                }}
                            >
                                <SelectTrigger className="h-7 w-44 text-xs">
                                    <SelectValue placeholder="Add field" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCaseFields.map((f) => (
                                        <SelectItem key={f.id} value={String(f.id)} className="text-xs">
                                            {f.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {appliesTo === 'results' && availableResultFields.length > 0 && (
                            <Select
                                onValueChange={(v) => {
                                    const field = availableResultFields.find((f) => String(f.id) === v);
                                    if (field) attach(field, appliesTo);
                                }}
                            >
                                <SelectTrigger className="h-7 w-44 text-xs">
                                    <SelectValue placeholder="Add field" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableResultFields.map((f) => (
                                        <SelectItem key={f.id} value={String(f.id)} className="text-xs">
                                            {f.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {items.length === 0 ? (
                        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                            {t('settings.fields.empty')}
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground text-xs">
                                    <th className="w-8 p-2" />
                                    <th className="p-2 font-medium">Field</th>
                                    <th className="p-2 font-medium">Type</th>
                                    <th className="p-2 font-medium">Scope</th>
                                    <th className="p-2 font-medium">Visibility</th>
                                    <th className="p-2 font-medium">Required</th>
                                    <th className="w-10 p-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((field) => renderFieldRow(field, appliesTo))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {renderTable('Case fields', caseFields, 'cases')}
            {renderTable('Result fields', resultFields, 'results')}
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
    allFields,
}: {
    project: Project;
    available: AvailableUser[];
    roles: ProjectRole[];
    allFields: ProjectField[];
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
                        <TabsTrigger value="fields">Custom fields</TabsTrigger>
                        <TabsTrigger value="danger">{t('settings.danger.tab')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="mt-4 max-w-2xl">
                        <GeneralTab project={project} />
                    </TabsContent>

                    <TabsContent value="members" className="mt-4 max-w-3xl">
                        <MembersTab project={project} available={available} roles={roles} />
                    </TabsContent>

                    <TabsContent value="fields" className="mt-4">
                        <FieldsTab project={project} allFields={allFields} />
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
