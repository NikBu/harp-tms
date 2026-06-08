import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    GripVertical,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
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
import { index as projectsIndex } from '@/routes/projects';

interface CaseRow {
    id: number;
    suite_id: number;
    section_id: number | null;
    title: string;
    template: number;
    type_id: string | null;
    priority_id: number | null;
    estimate: string | null;
    references: string | null;
}

interface SectionWithCases {
    id: number;
    name: string;
    parent_id: number | null;
    testCases: CaseRow[];
    children: SectionWithCases[];
}

interface SuiteWithCases {
    id: number;
    project_id: number;
    name: string;
    description: string | null;
    sections: SectionWithCases[];
}

/** A flattened section group ready to render, with its nesting depth. */
interface SectionGroup {
    id: number | null;
    name: string;
    depth: number;
    cases: CaseRow[];
}

const PRIORITY_KEYS: Record<number, string> = {
    1: 'critical',
    2: 'high',
    3: 'medium',
    4: 'low',
};

const PRIORITY_CLASSES: Record<number, string> = {
    1: 'border-transparent bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    2: 'border-transparent bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    3: 'border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    4: 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

/**
 * Depth-first flatten of the section tree into an ordered list of groups.
 * Each subsection keeps its nesting depth so headers can be indented.
 */
function flattenSections(
    sections: SectionWithCases[],
    depth: number,
): SectionGroup[] {
    const groups: SectionGroup[] = [];

    for (const section of sections) {
        groups.push({
            id: section.id,
            name: section.name,
            depth,
            cases: section.testCases ?? [],
        });

        if (section.children && section.children.length > 0) {
            groups.push(...flattenSections(section.children, depth + 1));
        }
    }

    return groups;
}

function PriorityBadge({ priorityId }: { priorityId: number | null }) {
    const t = useTrans();

    if (priorityId === null || !(priorityId in PRIORITY_KEYS)) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <span
            className={cn(
                'inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                PRIORITY_CLASSES[priorityId],
            )}
        >
            {t(`app.test_cases.priorities.${PRIORITY_KEYS[priorityId]}`)}
        </span>
    );
}

function CasesTable({
    cases,
    suiteId,
    onDelete,
}: {
    cases: CaseRow[];
    suiteId: number;
    onDelete: (testCase: CaseRow) => void;
}) {
    const t = useTrans();

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="w-8 px-2 py-2" />
                        <th className="w-8 px-2 py-2" />
                        <th className="w-20 px-3 py-2 font-medium">ID</th>
                        <th className="px-3 py-2 font-medium">
                            {t('app.test_cases.fields.title')}
                        </th>
                        <th className="w-28 px-3 py-2 font-medium">
                            {t('app.test_cases.fields.priority')}
                        </th>
                        <th className="w-32 px-3 py-2 font-medium">
                            {t('app.test_cases.fields.type')}
                        </th>
                        <th className="w-24 px-3 py-2 font-medium">
                            {t('app.test_cases.fields.estimate')}
                        </th>
                        <th className="w-32 px-3 py-2 font-medium">
                            {t('app.test_cases.fields.references')}
                        </th>
                        <th className="w-24 px-3 py-2 text-right font-medium" />
                    </tr>
                </thead>
                <tbody>
                    {cases.map((testCase) => (
                        <tr
                            key={testCase.id}
                            className="group border-b last:border-0 hover:bg-muted/50"
                        >
                            <td className="px-2 py-2 align-middle">
                                <GripVertical className="size-4 cursor-grab text-muted-foreground/40" />
                            </td>
                            <td className="px-2 py-2 align-middle">
                                <Checkbox aria-label={testCase.title} />
                            </td>
                            <td className="px-3 py-2 align-middle">
                                <Link
                                    href={showCase.url(testCase.id)}
                                    className="text-xs text-muted-foreground hover:underline"
                                >
                                    C{testCase.id}
                                </Link>
                            </td>
                            <td className="px-3 py-2 align-middle">
                                <Link
                                    href={showCase.url(testCase.id)}
                                    className="font-medium hover:underline"
                                >
                                    {testCase.title}
                                </Link>
                            </td>
                            <td className="px-3 py-2 align-middle">
                                <PriorityBadge
                                    priorityId={testCase.priority_id}
                                />
                            </td>
                            <td className="px-3 py-2 align-middle text-muted-foreground">
                                {testCase.type_id ?? '—'}
                            </td>
                            <td className="px-3 py-2 align-middle text-muted-foreground">
                                {testCase.estimate ?? '—'}
                            </td>
                            <td className="px-3 py-2 align-middle text-muted-foreground">
                                {testCase.references ?? '—'}
                            </td>
                            <td className="px-3 py-2 align-middle">
                                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        title={t('app.common.edit')}
                                    >
                                        <Link href={editCase.url(testCase.id)}>
                                            <Pencil className="size-4" />
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(testCase)}
                                        title={t('app.common.delete')}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Link
                href={createCase.url(suiteId)}
                className="flex items-center gap-2 border-t px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
                <Plus className="size-4" />
                {t('app.test_cases.add')}
            </Link>
        </div>
    );
}

function SectionGroupBlock({
    group,
    suiteId,
    expanded,
    onToggle,
    onEditSection,
    onDeleteSection,
    onDeleteCase,
}: {
    group: SectionGroup;
    suiteId: number;
    expanded: boolean;
    onToggle: () => void;
    onEditSection: (group: SectionGroup) => void;
    onDeleteSection: (group: SectionGroup) => void;
    onDeleteCase: (testCase: CaseRow) => void;
}) {
    const t = useTrans();
    const ChevronIcon = expanded ? ChevronDown : ChevronRight;

    return (
        <div className="rounded-md border">
            <div
                className="group flex items-center gap-2 border-b bg-muted/40 px-2 py-2"
                style={{ paddingLeft: `${0.5 + group.depth * 1.25}rem` }}
            >
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                    <ChevronIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-semibold">
                        {group.name}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {group.cases.length}
                    </span>
                </button>

                {group.id !== null ? (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditSection(group)}
                            title={t('app.sections.edit')}
                        >
                            <Pencil className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteSection(group)}
                            title={t('app.common.delete')}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ) : null}
            </div>

            {expanded ? (
                <CasesTable
                    cases={group.cases}
                    suiteId={suiteId}
                    onDelete={onDeleteCase}
                />
            ) : null}
        </div>
    );
}

type SectionDialogState =
    | { mode: 'create'; parentId: number | null }
    | { mode: 'edit'; sectionId: number }
    | null;

export default function SuitesShow({
    suite,
    unsectioned_cases,
}: {
    suite: SuiteWithCases;
    unsectioned_cases: CaseRow[];
}) {
    const t = useTrans();

    const sectionGroups = flattenSections(suite.sections, 0);

    const groups: SectionGroup[] = [
        {
            id: null,
            name: t('app.test_cases.unsectioned'),
            depth: 0,
            cases: unsectioned_cases,
        },
        ...sectionGroups,
    ];

    const [collapsed, setCollapsed] = useState<Set<number | null>>(new Set());
    const [dialog, setDialog] = useState<SectionDialogState>(null);
    const [name, setName] = useState('');

    function toggle(id: number | null) {
        setCollapsed((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function openCreateSection(parentId: number | null) {
        setName('');
        setDialog({ mode: 'create', parentId });
    }

    function openEditSection(group: SectionGroup) {
        if (group.id === null) {
            return;
        }

        setName(group.name);
        setDialog({ mode: 'edit', sectionId: group.id });
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
                storeSection.url({
                    project: suite.project_id,
                    suite: suite.id,
                }),
                { name, parent_id: dialog.parentId },
                { onSuccess: closeDialog, preserveScroll: true },
            );
        } else {
            router.patch(
                updateSection.url(dialog.sectionId),
                { name },
                { onSuccess: closeDialog, preserveScroll: true },
            );
        }
    }

    function deleteSection(group: SectionGroup) {
        if (group.id === null) {
            return;
        }

        if (!window.confirm(t('app.common.confirm_delete'))) {
            return;
        }

        router.delete(destroySection.url(group.id), { preserveScroll: true });
    }

    function deleteCase(testCase: CaseRow) {
        if (!window.confirm(t('app.common.confirm_delete'))) {
            return;
        }

        router.delete(destroyCase.url(testCase.id), { preserveScroll: true });
    }

    return (
        <>
            <Head title={suite.name} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="grid gap-1">
                        <h1 className="text-2xl font-semibold">{suite.name}</h1>
                        {suite.description ? (
                            <p className="text-sm text-muted-foreground">
                                {suite.description}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => openCreateSection(null)}
                        >
                            <Plus className="size-4" />
                            {t('app.sections.add')}
                        </Button>
                        <Button asChild>
                            <Link href={createCase.url(suite.id)}>
                                <Plus className="size-4" />
                                {t('app.test_cases.add')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3">
                    {groups.map((group) => (
                        <SectionGroupBlock
                            key={group.id === null ? 'unsectioned' : group.id}
                            group={group}
                            suiteId={suite.id}
                            expanded={!collapsed.has(group.id)}
                            onToggle={() => toggle(group.id)}
                            onEditSection={openEditSection}
                            onDeleteSection={deleteSection}
                            onDeleteCase={deleteCase}
                        />
                    ))}
                </div>
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
                            <Button type="submit">
                                {t('app.common.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

SuitesShow.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
