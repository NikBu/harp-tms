import { Head, router } from '@inertiajs/react';
import { Folder, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    destroy as destroySection,
    store as storeSection,
    update as updateSection,
} from '@/actions/App/Http/Controllers/SectionController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project, Section, Suite } from '@/types';

type SuiteWithSections = Suite & { sections: Section[] };

type SectionDialogState =
    | { mode: 'create'; parentId: number | null; suiteId: number; projectId: number }
    | { mode: 'edit'; section: Section }
    | null;

function SectionRow({
    section,
    depth,
    onAddChild,
    onEdit,
    onDelete,
}: {
    section: Section;
    depth: number;
    onAddChild: (parentId: number) => void;
    onEdit: (section: Section) => void;
    onDelete: (section: Section) => void;
}) {
    const [hovered, setHovered] = useState(false);
    const hasChildren = (section.children ?? []).length > 0;

    return (
        <div>
            <div
                className={cn(
                    'group flex items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors',
                    'hover:bg-accent/50',
                )}
                style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <div className="flex min-w-0 items-center gap-2">
                    {hasChildren ? (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    ) : (
                        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-sm">{section.name}</span>
                </div>

                <div className={cn(
                    'flex shrink-0 items-center gap-0.5 transition-opacity',
                    hovered ? 'opacity-100' : 'opacity-0',
                )}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onAddChild(section.id)}
                        title="Add subsection"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(section)}
                        title="Edit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete(section)}
                        title="Delete"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {(section.children ?? []).length > 0 && (
                <div className="relative ml-5 border-l border-border/60 pl-0">
                    {(section.children ?? []).map((child) => (
                        <SectionRow
                            key={child.id}
                            section={child}
                            depth={depth + 1}
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SuitesShow({
    project,
    suite,
}: {
    project: Project;
    suite: SuiteWithSections;
}) {
    const t = useTrans();
    const [dialog, setDialog] = useState<SectionDialogState>(null);
    const [name, setName] = useState('');

    function openCreate(parentId: number | null) {
        setName('');
        setDialog({ mode: 'create', parentId, suiteId: suite.id, projectId: suite.project_id });
    }

    function openEdit(section: Section) {
        setName(section.name);
        setDialog({ mode: 'edit', section });
    }

    function closeDialog() { setDialog(null); }

    function submitDialog(event: React.FormEvent) {
        event.preventDefault();
        if (dialog === null) return;

        if (dialog.mode === 'create') {
            router.post(
                storeSection.url({ project: dialog.projectId, suite: dialog.suiteId }),
                { name, parent_id: dialog.parentId },
                { onSuccess: closeDialog, preserveScroll: true },
            );
        } else {
            router.patch(
                updateSection.url(dialog.section.id),
                { name },
                { onSuccess: closeDialog, preserveScroll: true },
            );
        }
    }

    function deleteSection(section: Section) {
        if (!window.confirm(t('app.common.confirm_delete'))) return;
        router.delete(destroySection.url(section.id), { preserveScroll: true });
    }

    return (
        <>
            <Head title={suite.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Page header */}
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold">{suite.name}</h1>
                        {suite.description ? (
                            <p className="mt-1 text-sm text-muted-foreground">{suite.description}</p>
                        ) : null}
                    </div>
                </div>

                {/* Sections tree */}
                <div className="rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <h2 className="text-sm font-medium">{t('app.sections.title')}</h2>
                        <Button variant="outline" size="sm" onClick={() => openCreate(null)}>
                            <Plus className="h-3.5 w-3.5" />
                            {t('app.sections.add')}
                        </Button>
                    </div>

                    <div className="p-2">
                        {suite.sections.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                                <Folder className="h-8 w-8 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">
                                    {t('app.sections.empty')}
                                </p>
                                <Button variant="outline" size="sm" className="mt-1" onClick={() => openCreate(null)}>
                                    <Plus className="h-3.5 w-3.5" />
                                    {t('app.sections.add')}
                                </Button>
                            </div>
                        ) : (
                            <div>
                                {suite.sections.map((section) => (
                                    <SectionRow
                                        key={section.id}
                                        section={section}
                                        depth={0}
                                        onAddChild={openCreate}
                                        onEdit={openEdit}
                                        onDelete={deleteSection}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
                <DialogContent>
                    <form onSubmit={submitDialog} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>
                                {dialog?.mode === 'edit' ? t('app.sections.edit') : t('app.sections.add')}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-2">
                            <Label htmlFor="section-name">{t('app.projects.name')}</Label>
                            <Input
                                id="section-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                {t('app.common.cancel')}
                            </Button>
                            <Button type="submit">{t('app.common.save')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

SuitesShow.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
    ],
};
