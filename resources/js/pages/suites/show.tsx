import { Head, router } from '@inertiajs/react';
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    destroy as destroySection,
    store as storeSection,
    update as updateSection,
} from '@/actions/App/Http/Controllers/SectionController';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project, Section, Suite } from '@/types';

type SuiteWithSections = Suite & { sections: Section[] };

type SectionDialogState =
    | { mode: 'create'; parentId: number | null; suiteId: number }
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
    const t = useTrans();

    return (
        <>
            <div
                className="flex items-center justify-between gap-2 rounded-md border p-3"
                style={{ marginLeft: `${depth * 1.5}rem` }}
            >
                <div className="flex min-w-0 items-center gap-2">
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">
                        {section.name}
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onAddChild(section.id)}
                        title={t('app.sections.add_subsection')}
                    >
                        <Plus className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(section)}
                        title={t('app.sections.edit')}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(section)}
                        title={t('app.common.delete')}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

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
        </>
    );
}

export default function SuitesShow({
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
        setDialog({ mode: 'create', parentId, suiteId: suite.id });
    }

    function openEdit(section: Section) {
        setName(section.name);
        setDialog({ mode: 'edit', section });
    }

    function closeDialog() {
        setDialog(null);
    }

    function submitDialog(event: React.FormEvent) {
        event.preventDefault();

        if (dialog === null) {
            return;
        }

        if (dialog.mode === 'create') {
            router.post(
                storeSection.url(dialog.suiteId),
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
        if (!window.confirm(t('app.common.confirm_delete'))) {
            return;
        }

        router.delete(destroySection.url(section.id), {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title={suite.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="grid gap-1">
                        <h1 className="text-2xl font-semibold">{suite.name}</h1>
                        {suite.description ? (
                            <p className="text-sm text-muted-foreground">
                                {suite.description}
                            </p>
                        ) : null}
                    </div>
                </div>

                <Card>
                    <CardContent className="grid gap-2">
                        <h2 className="text-lg font-medium">
                            {t('app.sections.title')}
                        </h2>

                        {suite.sections.length === 0 ? (
                            <p className="py-4 text-sm text-muted-foreground">
                                {t('app.sections.empty')}
                            </p>
                        ) : (
                            <div className="grid gap-2">
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

                        <div className="pt-2">
                            <Button
                                variant="outline"
                                onClick={() => openCreate(null)}
                            >
                                <Plus className="size-4" />
                                {t('app.sections.add')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog
                open={dialog !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeDialog();
                    }
                }}
            >
                <DialogContent>
                    <form onSubmit={submitDialog} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>
                                {dialog?.mode === 'edit'
                                    ? t('app.sections.edit')
                                    : t('app.sections.add')}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-2">
                            <Label htmlFor="section-name">
                                {t('app.projects.name')}
                            </Label>
                            <Input
                                id="section-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeDialog}
                            >
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
        {
            title: 'Projects',
            href: projectsIndex(),
        },
    ],
};
