import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronRight,
    ClipboardList,
    Folder,
    FolderOpen,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
    destroy as destroySection,
    store as storeSection,
    update as updateSection,
} from '@/actions/App/Http/Controllers/SectionController';
import {
    create as createCase,
    destroy as destroyCase,
    edit as editCase,
    show as showCase,
} from '@/actions/App/Http/Controllers/TestCaseController';
import { Badge } from '@/components/ui/badge';
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
import type { Project, Section, Suite } from '@/types';
import type { TestCase } from '@/types/test-case';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionWithCases = Section & {
    children?: SectionWithCases[];
    testCases?: TestCase[];
};

type SuiteWithData = Suite & {
    sections: SectionWithCases[];
    unsectioned_cases?: TestCase[];
};

type SectionDialogState =
    | { mode: 'create'; parentId: number | null; suiteId: number; projectId: number }
    | { mode: 'edit'; section: Section }
    | null;

// ─── Priority helpers ─────────────────────────────────────────────────────────

const PRIORITY_CLASSES: Record<number, string> = {
    1: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    2: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    3: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    4: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

const PRIORITY_LABELS: Record<number, string> = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };

const TEMPLATE_LABELS: Record<number, string> = {
    1: 'Text', 2: 'Steps', 3: 'Exploratory', 4: 'BDD', 5: 'Checklist',
};

// ─── CaseRow ─────────────────────────────────────────────────────────────────

function CaseRow({
    testCase,
    onDelete,
}: {
    testCase: TestCase;
    onDelete: (tc: TestCase) => void;
}) {
    return (
        <div className="group flex items-center gap-3 border-b border-border/50 px-4 py-2.5 last:border-0 hover:bg-muted/30">
            <ClipboardList className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />

            <Link
                href={showCase.url(testCase.id)}
                className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
            >
                {testCase.title}
            </Link>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
                {testCase.priority_id ? (
                    <span className={cn(
                        'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
                        PRIORITY_CLASSES[testCase.priority_id] ?? PRIORITY_CLASSES[4],
                    )}>
                        {PRIORITY_LABELS[testCase.priority_id]}
                    </span>
                ) : null}
                <Badge variant="secondary" className="text-xs font-normal">
                    {TEMPLATE_LABELS[testCase.template] ?? 'Steps'}
                </Badge>
            </div>

            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Edit">
                    <Link href={editCase.url(testCase.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(testCase)}
                    title="Delete"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}

// ─── SectionBlock ─────────────────────────────────────────────────────────────
// Renders a section header + its cases + its children sections recursively.
// All sections start expanded.

function SectionBlock({
    section,
    depth,
    suiteId,
    projectId,
    onAddChildSection,
    onEditSection,
    onDeleteSection,
    onDeleteCase,
}: {
    section: SectionWithCases;
    depth: number;
    suiteId: number;
    projectId: number;
    onAddChildSection: (parentId: number) => void;
    onEditSection: (section: Section) => void;
    onDeleteSection: (section: Section) => void;
    onDeleteCase: (tc: TestCase) => void;
}) {
    const [open, setOpen] = useState(true);
    const cases = section.testCases ?? [];
    const children = section.children ?? [];
    const hasContent = cases.length > 0 || children.length > 0;

    return (
        <div style={{ marginLeft: depth > 0 ? '1.25rem' : 0 }}>
            {/* Section header */}
            <div className="group flex items-center gap-1 border-b border-border/40 bg-muted/20 px-3 py-2">
                <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setOpen((o) => !o)}
                >
                    <ChevronRight
                        className={cn(
                            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                            open && 'rotate-90',
                        )}
                    />
                    {open
                        ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        : <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    }
                    <span className="truncate text-sm font-medium">{section.name}</span>
                    {cases.length > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                            ({cases.length})
                        </span>
                    )}
                </button>

                {/* Section actions — visible on hover */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        title="Add test case"
                        asChild
                    >
                        <Link href={createCase.url(suiteId) + `?section_id=${section.id}`}>
                            <Plus className="h-3 w-3" />
                        </Link>
                    </Button>
                    <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        title="Add subsection"
                        onClick={() => onAddChildSection(section.id)}
                    >
                        <Folder className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        title="Edit section"
                        onClick={() => onEditSection(section)}
                    >
                        <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                        title="Delete section"
                        onClick={() => onDeleteSection(section)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Cases + children when open */}
            {open && (
                <div>
                    {cases.map((tc) => (
                        <CaseRow key={tc.id} testCase={tc} onDelete={onDeleteCase} />
                    ))}
                    {cases.length === 0 && children.length === 0 && (
                        <div className="flex items-center gap-2 px-6 py-2 text-xs text-muted-foreground/60 italic">
                            No test cases yet —{' '}
                            <Link
                                href={createCase.url(suiteId) + `?section_id=${section.id}`}
                                className="text-primary hover:underline not-italic"
                            >
                                add one
                            </Link>
                        </div>
                    )}
                    {children.map((child) => (
                        <SectionBlock
                            key={child.id}
                            section={child}
                            depth={depth + 1}
                            suiteId={suiteId}
                            projectId={projectId}
                            onAddChildSection={onAddChildSection}
                            onEditSection={onEditSection}
                            onDeleteSection={onDeleteSection}
                            onDeleteCase={onDeleteCase}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SuitesShow({
    project,
    suite,
}: {
    project: Project;
    suite: SuiteWithData;
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
        if (!dialog) return;

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

    function deleteCase(tc: TestCase) {
        if (!window.confirm(t('app.common.confirm_delete'))) return;
        router.delete(destroyCase.url(tc.id), { preserveScroll: true });
    }

    const unsectioned = suite.unsectioned_cases ?? [];
    const totalCases =
        unsectioned.length +
        (suite.sections ?? []).reduce((sum, s) => sum + (s.cases?.length ?? 0), 0);

    return (
        <>
            <Head title={suite.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">

                {/* Page header */}
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold">{suite.name}</h1>
                        {suite.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{suite.description}</p>
                        )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => openCreate(null)}>
                            <Folder className="h-3.5 w-3.5" />
                            {t('app.sections.add')}
                        </Button>
                        <Button asChild size="sm">
                            <Link href={createCase.url(suite.id)}>
                                <Plus className="h-3.5 w-3.5" />
                                {t('app.test_cases.create')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Cases + sections tree */}
                <div className="rounded-lg border border-border bg-card overflow-hidden">

                    {/* Toolbar */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                        <span className="text-sm text-muted-foreground">
                            {totalCases} {totalCases === 1 ? 'test case' : 'test cases'}
                        </span>
                    </div>

                    {/* Empty state */}
                    {suite.sections.length === 0 && unsectioned.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                            <ClipboardList className="h-9 w-9 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">
                                {t('app.test_cases.empty')}
                            </p>
                            <Button asChild size="sm" className="mt-1">
                                <Link href={createCase.url(suite.id)}>
                                    <Plus className="h-3.5 w-3.5" />
                                    {t('app.test_cases.create')}
                                </Link>
                            </Button>
                        </div>
                    )}

                    {/* Unsectioned cases (no section) */}
                    {unsectioned.length > 0 && (
                        <div>
                            {unsectioned.map((tc) => (
                                <CaseRow key={tc.id} testCase={tc} onDelete={deleteCase} />
                            ))}
                        </div>
                    )}

                    {/* Sectioned cases */}
                    {suite.sections.map((section) => (
                        <SectionBlock
                            key={section.id}
                            section={section}
                            depth={0}
                            suiteId={suite.id}
                            projectId={suite.project_id}
                            onAddChildSection={openCreate}
                            onEditSection={openEdit}
                            onDeleteSection={deleteSection}
                            onDeleteCase={deleteCase}
                        />
                    ))}
                </div>
            </div>

            {/* Section create/edit dialog */}
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
        { title: 'Projects', href: '/projects' },
    ],
};
