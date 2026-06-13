import { Head, Link, router } from '@inertiajs/react';
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    ArrowDownUp,
    ChevronDown,
    ChevronRight,
    Columns3,
    Copy,
    Download,
    Filter,
    GripVertical,
    Pencil,
    Plus,
    Trash2,
    User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useTrans } from '@/hooks/use-trans';
import type { Section, Suite, SuiteCase } from '@/types';
import {
    destroy as destroySection,
    store as storeSection,
    update as updateSection,
} from '@/actions/App/Http/Controllers/SectionController';
import {
    bulkAssign,
    bulkDestroy,
    bulkUpdate,
    copy,
    edit as editCase,
    show as showCase,
} from '@/actions/App/Http/Controllers/TestCaseController';
import { index as projectsIndex } from '@/routes/projects';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_KEYS: Record<number, string> = {
    1: 'critical',
    2: 'high',
    3: 'medium',
    4: 'low',
};

const PRIORITY_COLORS: Record<number, string> = {
    1: 'text-destructive',
    2: 'text-orange-500',
    3: 'text-yellow-600',
    4: 'text-muted-foreground',
};

const TEMPLATE_KEYS: Record<number, string> = {
    1: 'text',
    2: 'steps',
    3: 'exploratory',
    4: 'bdd',
    5: 'checklist',
};

const PRIORITY_OPTIONS = [1, 2, 3, 4];
const TEMPLATE_OPTIONS = [1, 2, 3, 4, 5];

// ── Column visibility ─────────────────────────────────────────────────────────

type ColumnKey =
    | 'priority'
    | 'template'
    | 'type'
    | 'estimate'
    | 'references'
    | 'assigned_to';

const COLUMN_KEYS: ColumnKey[] = [
    'priority',
    'template',
    'type',
    'estimate',
    'references',
    'assigned_to',
];

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
    priority: true,
    template: true,
    type: true,
    estimate: false,
    references: false,
    assigned_to: true,
};

function columnsStorageKey(suiteId: number): string {
    return `harp_suite_columns_${suiteId}`;
}

function loadColumns(suiteId: number): Record<ColumnKey, boolean> {
    if (typeof window === 'undefined') return { ...DEFAULT_COLUMNS };
    try {
        const raw = window.localStorage.getItem(columnsStorageKey(suiteId));
        if (!raw) return { ...DEFAULT_COLUMNS };
        const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, boolean>>;
        return COLUMN_KEYS.reduce(
            (acc, key) => {
                acc[key] =
                    typeof parsed[key] === 'boolean'
                        ? parsed[key]!
                        : DEFAULT_COLUMNS[key];
                return acc;
            },
            {} as Record<ColumnKey, boolean>,
        );
    } catch {
        return { ...DEFAULT_COLUMNS };
    }
}

// ── Sort ──────────────────────────────────────────────────────────────────────

type SortField = 'id' | 'title' | 'priority' | 'type' | 'estimate';
type SortDir = 'asc' | 'desc';

function sortCases(
    cases: SuiteCase[],
    field: SortField,
    dir: SortDir,
): SuiteCase[] {
    const sorted = [...cases].sort((a, b) => {
        let cmp = 0;
        switch (field) {
            case 'id':
                cmp = a.id - b.id;
                break;
            case 'title':
                cmp = a.title.localeCompare(b.title);
                break;
            case 'priority':
                cmp = (a.priority_id ?? 999) - (b.priority_id ?? 999);
                break;
            case 'type':
                cmp = (a.type_id ?? '').localeCompare(b.type_id ?? '');
                break;
            case 'estimate':
                cmp = (a.estimate ?? 999999) - (b.estimate ?? 999999);
                break;
        }
        return dir === 'asc' ? cmp : -cmp;
    });
    return sorted;
}

// ── Filter ────────────────────────────────────────────────────────────────────

type Filters = {
    priorities: number[];
    templates: number[];
    sectionId: number | null;
    hasRequirements: boolean | null;
};

const EMPTY_FILTERS: Filters = {
    priorities: [],
    templates: [],
    sectionId: null,
    hasRequirements: null,
};

function caseMatches(c: SuiteCase, f: Filters): boolean {
    if (
        f.priorities.length > 0 &&
        (c.priority_id === null || !f.priorities.includes(c.priority_id))
    )
        return false;
    if (f.templates.length > 0 && !f.templates.includes(c.template))
        return false;
    if (f.sectionId !== null && c.section_id !== f.sectionId) return false;
    if (f.hasRequirements !== null && c.has_requirements !== f.hasRequirements)
        return false;
    return true;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenSections(sections: Section[]): Section[] {
    return sections.flatMap((s) => [s, ...flattenSections(s.children ?? [])]);
}

function collectCases(sections: Section[]): SuiteCase[] {
    return sections.flatMap((s) => [
        ...((s.testCases as SuiteCase[]) ?? []),
        ...collectCases(s.children ?? []),
    ]);
}

function formatEstimate(seconds: number | null): string {
    if (seconds === null) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// ── Dialog types ──────────────────────────────────────────────────────────────

type SectionDialogState =
    | {
          mode: 'create';
          parentId: number | null;
          suiteId: number;
          projectId: number;
      }
    | { mode: 'edit'; section: Section }
    | null;

// ── DraggableCaseRow ────────────────────────────────────────────────────────

function DraggableCaseRow({
    c,
    visibleCols,
    selectedIds,
    copyingId,
    onToggleCase,
    onCopy,
}: {
    c: SuiteCase;
    visibleCols: Record<ColumnKey, boolean>;
    selectedIds: Set<number>;
    copyingId: number | null;
    onToggleCase: (id: number) => void;
    onCopy: (id: number) => void;
}) {
    const t = useTrans();
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `case-${c.id}`,
        data: { caseId: c.id },
    });

    return (
        <tr
            ref={setNodeRef}
            className={`border-b border-border last:border-0 hover:bg-muted/40 ${isDragging ? 'opacity-50' : ''}`}
        >
            <td className="w-10 px-2 py-2">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                        title={t('app.test_cases.toolbar.drag_hint')}
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="size-4" />
                    </button>
                    <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => onToggleCase(c.id)}
                        className="size-5 border-2 border-gray-400 dark:border-gray-500"
                    />
                </div>
            </td>
            <td className="px-3 py-2 font-medium">
                <Link
                    href={showCase.url(c.id)}
                    className="hover:text-primary hover:underline"
                >
                    {c.title}
                </Link>
            </td>
            {visibleCols.priority && (
                <td className="w-28 px-3 py-2">
                    {c.priority_id ? (
                        <span
                            className={`text-xs capitalize ${PRIORITY_COLORS[c.priority_id] ?? ''}`}
                        >
                            {t(
                                `app.requirements.priorities.${PRIORITY_KEYS[c.priority_id]}`,
                            )}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    )}
                </td>
            )}
            {visibleCols.template && (
                <td className="w-28 px-3 py-2 text-xs text-muted-foreground capitalize">
                    {t(
                        `app.test_cases.templates.${TEMPLATE_KEYS[c.template] ?? 'steps'}`,
                    )}
                </td>
            )}
            {visibleCols.type && (
                <td className="w-32 px-3 py-2 text-xs text-muted-foreground capitalize">
                    {c.type_id ?? '—'}
                </td>
            )}
            {visibleCols.estimate && (
                <td className="w-24 px-3 py-2 text-xs text-muted-foreground">
                    {formatEstimate(c.estimate)}
                </td>
            )}
            {visibleCols.references && (
                <td className="w-32 max-w-[8rem] truncate px-3 py-2 text-xs text-muted-foreground">
                    {c.references ?? '—'}
                </td>
            )}
            {visibleCols.assigned_to && (
                <td className="w-32 px-3 py-2 text-xs text-muted-foreground">
                    {c.assignee_name ?? '—'}
                </td>
            )}
            <td className="w-16 px-2 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        asChild
                        title={t('app.common.edit')}
                    >
                        <Link href={editCase.url(c.id)}>
                            <Pencil className="size-4" />
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={copyingId === c.id}
                        onClick={() => onCopy(c.id)}
                        title={t('app.test_cases.toolbar.copy')}
                    >
                        <Copy className="size-4" />
                    </Button>
                </div>
            </td>
        </tr>
    );
}

// ── SectionRow ────────────────────────────────────────────────────────────────

function SectionRow({
    section,
    depth,
    collapsed,
    sortField,
    sortDir,
    visibleCols,
    filters,
    hideUnassigned,
    selectedIds,
    copyingId,
    onToggleCollapse,
    onToggleCase,
    onCopy,
    onAddChild,
    onEdit,
    onDelete,
}: {
    section: Section;
    depth: number;
    collapsed: Set<number>;
    sortField: SortField;
    sortDir: SortDir;
    visibleCols: Record<ColumnKey, boolean>;
    filters: Filters;
    hideUnassigned: boolean;
    selectedIds: Set<number>;
    copyingId: number | null;
    onToggleCollapse: (id: number) => void;
    onToggleCase: (id: number) => void;
    onCopy: (id: number) => void;
    onAddChild: (parentId: number) => void;
    onEdit: (section: Section) => void;
    onDelete: (section: Section) => void;
}) {
    const t = useTrans();
    const isVirtual = section.id === 0;
    const isCollapsed = collapsed.has(section.id);
    const rawCases = (section.testCases as SuiteCase[] | undefined) ?? [];
    const cases = sortCases(
        rawCases.filter(
            (c) =>
                caseMatches(c, filters) &&
                (!hideUnassigned || c.assigned_to_id !== null),
        ),
        sortField,
        sortDir,
    );

    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: `section-${section.id}`,
        data: { sectionId: section.id },
    });

    return (
        <>
            {/* Section header row */}
            <div
                className={`flex items-center justify-between gap-2 rounded-md border border-border p-3 ${isOver ? 'ring-2 ring-primary' : ''}`}
                style={{ marginLeft: `${depth * 1.5}rem` }}
            >
                <button
                    type="button"
                    className="flex min-w-0 items-center gap-2 text-left"
                    onClick={() => onToggleCollapse(section.id)}
                >
                    <ChevronRight
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                    />
                    <span className="truncate text-sm font-medium">
                        {section.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        ({rawCases.length})
                    </span>
                </button>
                {!isVirtual && (
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
                )}
            </div>

            {/* Cases table — droppable target */}
            {!isCollapsed ? (
                <div
                    ref={setDropRef}
                    className={`overflow-hidden rounded-md border border-border ${isOver ? 'ring-2 ring-primary' : ''}`}
                    style={{ marginLeft: `${(depth + 1) * 1.5}rem` }}
                >
                    {cases.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                                    <th className="w-10 px-3 py-2" />
                                    <th className="px-3 py-2 font-medium">
                                        {t('app.test_cases.fields.title')}
                                    </th>
                                    {visibleCols.priority && (
                                        <th className="w-28 px-3 py-2 font-medium">
                                            {t(
                                                'app.test_cases.fields.priority',
                                            )}
                                        </th>
                                    )}
                                    {visibleCols.template && (
                                        <th className="w-28 px-3 py-2 font-medium">
                                            {t(
                                                'app.test_cases.fields.template',
                                            )}
                                        </th>
                                    )}
                                    {visibleCols.type && (
                                        <th className="w-32 px-3 py-2 font-medium">
                                            {t('app.test_cases.fields.type')}
                                        </th>
                                    )}
                                    {visibleCols.estimate && (
                                        <th className="w-24 px-3 py-2 font-medium">
                                            {t(
                                                'app.test_cases.fields.estimate',
                                            )}
                                        </th>
                                    )}
                                    {visibleCols.references && (
                                        <th className="w-32 px-3 py-2 font-medium">
                                            {t(
                                                'app.test_cases.fields.references',
                                            )}
                                        </th>
                                    )}
                                    {visibleCols.assigned_to && (
                                        <th className="w-32 px-3 py-2 font-medium">
                                            {t(
                                                'app.test_cases.fields.assigned_to',
                                            )}
                                        </th>
                                    )}
                                    <th className="w-16 px-2 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {cases.map((c) => (
                                    <DraggableCaseRow
                                        key={c.id}
                                        c={c}
                                        visibleCols={visibleCols}
                                        selectedIds={selectedIds}
                                        copyingId={copyingId}
                                        onToggleCase={onToggleCase}
                                        onCopy={onCopy}
                                    />
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="px-3 py-3 text-xs text-muted-foreground">
                            {t('app.test_cases.empty_section')}
                        </p>
                    )}
                </div>
            ) : null}

            {/* Child sections */}
            {!isCollapsed
                ? (section.children ?? []).map((child) => (
                      <SectionRow
                          key={child.id}
                          section={child}
                          depth={depth + 1}
                          collapsed={collapsed}
                          sortField={sortField}
                          sortDir={sortDir}
                          visibleCols={visibleCols}
                          filters={filters}
                          hideUnassigned={hideUnassigned}
                          selectedIds={selectedIds}
                          copyingId={copyingId}
                          onToggleCollapse={onToggleCollapse}
                          onToggleCase={onToggleCase}
                          onCopy={onCopy}
                          onAddChild={onAddChild}
                          onEdit={onEdit}
                          onDelete={onDelete}
                      />
                  ))
                : null}
        </>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

type ProjectMember = { id: number; name: string };

export default function SuitesShow({
    suite,
    sections,
    members = [],
}: {
    suite: Suite;
    sections: Section[];
    members?: ProjectMember[];
}) {
    const t = useTrans();

    // Section dialog
    const [dialog, setDialog] = useState<SectionDialogState>(null);
    const [name, setName] = useState('');

    // Toolbar state
    const [sortField, setSortField] = useState<SortField>('id');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
    const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>(
        () => loadColumns(suite.id),
    );

    // Filter state
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
    const [hideUnassigned, setHideUnassigned] = useState(false);

    // Drag-and-drop sensors — a small activation distance avoids hijacking clicks
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const caseId = event.active.data.current?.caseId as number | undefined;
        const targetSectionId = event.over?.data.current?.sectionId as
            | number
            | undefined;

        if (caseId === undefined || targetSectionId === undefined) return;

        const source = allCases.find((c) => c.id === caseId);
        const currentSectionId = source?.section_id ?? 0;
        if (currentSectionId === targetSectionId) return;

        router.patch(
            bulkUpdate.url(),
            { ids: [caseId], section_id: targetSectionId },
            { preserveScroll: true },
        );
    }

    // Selection + bulk edit
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [copyingId, setCopyingId] = useState<number | null>(null);
    const [bulkCopying, setBulkCopying] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkPriority, setBulkPriority] = useState('');
    const [bulkSection, setBulkSection] = useState('');
    const [bulkType, setBulkType] = useState('');

    const flatSections = useMemo(() => flattenSections(sections), [sections]);
    const allCases = useMemo(() => collectCases(sections), [sections]);

    const activeFilterCount =
        filters.priorities.length +
        filters.templates.length +
        (filters.sectionId !== null ? 1 : 0) +
        (filters.hasRequirements !== null ? 1 : 0);

    // Persist column visibility
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(
                columnsStorageKey(suite.id),
                JSON.stringify(visibleCols),
            );
        }
    }, [suite.id, visibleCols]);

    // Collapse helpers
    function allSectionIds(secs: Section[]): number[] {
        return secs.flatMap((s) => [s.id, ...allSectionIds(s.children ?? [])]);
    }
    const allCollapsed =
        sections.length > 0 &&
        allSectionIds(sections).every((id) => collapsed.has(id));

    function toggleCollapseAll() {
        setCollapsed(
            allCollapsed ? new Set() : new Set(allSectionIds(sections)),
        );
    }

    function toggleCollapse(id: number) {
        setCollapsed((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    // Selection helpers
    const allSelected =
        allCases.length > 0 && allCases.every((c) => selectedIds.has(c.id));

    function toggleSelectAll(checked: boolean) {
        setSelectedIds(
            checked ? new Set(allCases.map((c) => c.id)) : new Set(),
        );
    }

    function toggleCase(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    // Section dialog helpers
    function openCreate(parentId: number | null) {
        setName('');
        setDialog({
            mode: 'create',
            parentId,
            suiteId: suite.id,
            projectId: suite.project_id,
        });
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
        if (dialog === null) return;

        if (dialog.mode === 'create') {
            router.post(
                storeSection.url({
                    project: dialog.projectId,
                    suite: dialog.suiteId,
                }),
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

    // Filter helpers
    function openFilters() {
        setDraftFilters(filters);
        setFilterOpen(true);
    }

    function toggleDraftPriority(value: number) {
        setDraftFilters((f) => ({
            ...f,
            priorities: f.priorities.includes(value)
                ? f.priorities.filter((p) => p !== value)
                : [...f.priorities, value],
        }));
    }

    function toggleDraftTemplate(value: number) {
        setDraftFilters((f) => ({
            ...f,
            templates: f.templates.includes(value)
                ? f.templates.filter((tpl) => tpl !== value)
                : [...f.templates, value],
        }));
    }

    function applyFilters() {
        setFilters(draftFilters);
        setFilterOpen(false);
    }

    function clearFilters() {
        setDraftFilters(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setFilterOpen(false);
    }

    // Copy a single case into the current suite
    function copyCase(id: number) {
        setCopyingId(id);
        router.post(
            copy.url(id),
            { suite_id: suite.id },
            {
                preserveScroll: true,
                onFinish: () => setCopyingId(null),
            },
        );
    }

    // Copy all selected cases into the current suite
    function copySelected() {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        setBulkCopying(true);
        let remaining = ids.length;
        ids.forEach((id) => {
            router.post(
                copy.url(id),
                { suite_id: suite.id },
                {
                    preserveScroll: true,
                    onFinish: () => {
                        remaining -= 1;
                        if (remaining === 0) {
                            setBulkCopying(false);
                            setSelectedIds(new Set());
                        }
                    },
                },
            );
        });
    }

    // Bulk delete/edit
    function deleteSelected() {
        if (
            selectedIds.size === 0 ||
            !window.confirm(t('app.common.confirm_delete'))
        )
            return;
        router.delete(bulkDestroy.url(), {
            data: { ids: Array.from(selectedIds) },
            preserveScroll: true,
            onSuccess: () => setSelectedIds(new Set()),
        });
    }

    // Bulk assign selected cases to a project member (or unassign)
    function assignSelected(assignedToId: number | null) {
        if (selectedIds.size === 0) return;
        router.post(
            bulkAssign.url(),
            { ids: Array.from(selectedIds), assigned_to_id: assignedToId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedIds(new Set());
                    router.reload({ preserveScroll: true });
                },
            },
        );
    }

    function submitBulkEdit() {
        router.patch(
            bulkUpdate.url(),
            {
                ids: Array.from(selectedIds),
                priority: bulkPriority || null,
                section_id: bulkSection ? Number(bulkSection) : null,
                case_type: bulkType || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setBulkOpen(false);
                    setSelectedIds(new Set());
                    setBulkPriority('');
                    setBulkSection('');
                    setBulkType('');
                },
            },
        );
    }

    const exportUrl = (format: string) =>
        `/suites/${suite.id}/export?format=${format}`;

    return (
        <>
            <Head title={suite.name} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Page header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="grid gap-1">
                        <h1 className="text-2xl font-semibold">{suite.name}</h1>
                        {suite.description && (
                            <p className="text-sm text-muted-foreground">
                                {suite.description}
                            </p>
                        )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/suites/${suite.id}/edit`}>
                            <Pencil className="mr-1 size-4" />
                            {t('app.common.edit')}
                        </Link>
                    </Button>
                </div>

                {/* ── Toolbar ───────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-1 border-b pb-2">
                    {/* Sort */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <ArrowDownUp className="mr-1 size-4" />
                                {t('app.test_cases.toolbar.sort_by')}
                                <ChevronDown className="ml-1 size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {(
                                [
                                    'id',
                                    'title',
                                    'priority',
                                    'type',
                                    'estimate',
                                ] as SortField[]
                            ).map((field) => (
                                <DropdownMenuCheckboxItem
                                    key={field}
                                    checked={sortField === field}
                                    onCheckedChange={() => setSortField(field)}
                                >
                                    {t(`app.test_cases.toolbar.sort_${field}`)}
                                </DropdownMenuCheckboxItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={sortDir === 'asc'}
                                onCheckedChange={() => setSortDir('asc')}
                            >
                                A → Z
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={sortDir === 'desc'}
                                onCheckedChange={() => setSortDir('desc')}
                            >
                                Z → A
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Filter */}
                    <Button variant="outline" size="sm" onClick={openFilters}>
                        <Filter className="mr-1 size-4" />
                        {t('app.test_cases.toolbar.filter')}
                        {activeFilterCount > 0 && (
                            <Badge className="ml-1">{activeFilterCount}</Badge>
                        )}
                    </Button>

                    {/* Hide unassigned */}
                    <Button
                        variant={hideUnassigned ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setHideUnassigned((v) => !v)}
                    >
                        <User className="mr-1 size-4" />
                        {hideUnassigned
                            ? t('app.test_cases.toolbar.show_all')
                            : t('app.test_cases.toolbar.hide_unassigned')}
                    </Button>

                    {/* Collapse/expand */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleCollapseAll}
                    >
                        {allCollapsed
                            ? t('app.test_cases.toolbar.expand_all')
                            : t('app.test_cases.toolbar.collapse_all')}
                    </Button>

                    <div className="ml-auto flex flex-wrap items-center gap-1">
                        {/* Add Case + Add Section */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="default" size="sm">
                                    <Plus className="mr-1 size-4" />
                                    {t('app.test_cases.toolbar.add_case')}
                                    <ChevronDown className="ml-1 size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={`/suites/${suite.id}/cases/create`}
                                    >
                                        {t('app.test_cases.toolbar.add_case')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => openCreate(null)}
                                >
                                    {t('app.test_cases.toolbar.add_section')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Bulk edit — only when items selected */}
                        {selectedIds.size > 0 && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setBulkOpen(true)}
                                >
                                    <Pencil className="mr-1 size-4" />
                                    {t('app.test_cases.toolbar.edit_selected')}
                                    <Badge variant="secondary" className="ml-1">
                                        {selectedIds.size}
                                    </Badge>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copySelected}
                                    disabled={bulkCopying}
                                >
                                    <Copy className="mr-1 size-4" />
                                    {bulkCopying
                                        ? t('app.test_cases.toolbar.copying')
                                        : t(
                                              'app.test_cases.toolbar.copy_selected',
                                          )}
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <User className="mr-1 size-4" />
                                            {t(
                                                'app.test_cases.toolbar.assign_to',
                                            )}
                                            <ChevronDown className="ml-1 size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className="max-h-72 overflow-y-auto"
                                    >
                                        <DropdownMenuLabel>
                                            {t(
                                                'app.test_cases.toolbar.assign_to',
                                            )}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {members.length === 0 ? (
                                            <DropdownMenuItem disabled>
                                                {t(
                                                    'app.test_cases.toolbar.no_members',
                                                )}
                                            </DropdownMenuItem>
                                        ) : (
                                            members.map((m) => (
                                                <DropdownMenuItem
                                                    key={m.id}
                                                    onSelect={() =>
                                                        assignSelected(m.id)
                                                    }
                                                >
                                                    {m.name}
                                                </DropdownMenuItem>
                                            ))
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                assignSelected(null)
                                            }
                                        >
                                            {t(
                                                'app.test_cases.toolbar.unassign',
                                            )}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={deleteSelected}
                                >
                                    <Trash2 className="mr-1 size-4" />
                                    {t(
                                        'app.test_cases.toolbar.delete_selected',
                                    )}
                                </Button>
                            </>
                        )}

                        {/* Export */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Download className="mr-1 size-4" />
                                    {t('app.test_cases.toolbar.export')}
                                    <ChevronDown className="ml-1 size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <a href={exportUrl('csv')}>CSV</a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a href={exportUrl('xml')}>XML</a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Column visibility */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Columns3 className="mr-1 size-4" />
                                    {t('app.test_cases.toolbar.columns')}
                                    <ChevronDown className="ml-1 size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                    {t(
                                        'app.test_cases.toolbar.visible_columns',
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {COLUMN_KEYS.map((key) => (
                                    <DropdownMenuCheckboxItem
                                        key={key}
                                        checked={visibleCols[key]}
                                        onCheckedChange={(checked) =>
                                            setVisibleCols((prev) => ({
                                                ...prev,
                                                [key]: checked === true,
                                            }))
                                        }
                                    >
                                        {t(`app.test_cases.fields.${key}`)}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* ── Sections + Cases ──────────────────────────────────────── */}
                <Card>
                    <CardContent className="grid gap-2">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={(checked) =>
                                    toggleSelectAll(checked === true)
                                }
                                disabled={allCases.length === 0}
                                aria-label={t('app.common.select_all')}
                                className="size-5 border-2 border-gray-400 dark:border-gray-500"
                            />
                            <h2 className="text-lg font-medium">
                                {t('app.sections.title')}
                            </h2>
                            <span className="text-sm text-muted-foreground">
                                ({allCases.length})
                            </span>
                        </div>

                        {sections.length === 0 ? (
                            <p className="py-4 text-sm text-muted-foreground">
                                {t('app.sections.empty')}
                            </p>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="grid gap-2">
                                    {sections.map((section) => (
                                        <SectionRow
                                            key={section.id}
                                            section={section}
                                            depth={0}
                                            collapsed={collapsed}
                                            sortField={sortField}
                                            sortDir={sortDir}
                                            visibleCols={visibleCols}
                                            filters={filters}
                                            hideUnassigned={hideUnassigned}
                                            selectedIds={selectedIds}
                                            copyingId={copyingId}
                                            onToggleCollapse={toggleCollapse}
                                            onToggleCase={toggleCase}
                                            onCopy={copyCase}
                                            onAddChild={openCreate}
                                            onEdit={openEdit}
                                            onDelete={deleteSection}
                                        />
                                    ))}
                                </div>
                            </DndContext>
                        )}

                        <div className="flex gap-2 pt-2">
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

            {/* ── Section create/edit dialog ─────────────────────────────────── */}
            <Dialog
                open={dialog !== null}
                onOpenChange={(open) => {
                    if (!open) closeDialog();
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
                                {t('app.sections.name')}
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

            {/* ── Filter sheet ───────────────────────────────────────────────── */}
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetContent className="flex flex-col">
                    <SheetHeader>
                        <SheetTitle>
                            {t('app.test_cases.filters.title')}
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 space-y-6 overflow-y-auto px-4">
                        <div className="grid gap-2">
                            <Label>
                                {t('app.test_cases.filters.priority')}
                            </Label>
                            {PRIORITY_OPTIONS.map((p) => (
                                <label
                                    key={p}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        checked={draftFilters.priorities.includes(
                                            p,
                                        )}
                                        onCheckedChange={() =>
                                            toggleDraftPriority(p)
                                        }
                                    />
                                    {t(
                                        `app.requirements.priorities.${PRIORITY_KEYS[p]}`,
                                    )}
                                </label>
                            ))}
                        </div>
                        <div className="grid gap-2">
                            <Label>
                                {t('app.test_cases.filters.template')}
                            </Label>
                            {TEMPLATE_OPTIONS.map((tpl) => (
                                <label
                                    key={tpl}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        checked={draftFilters.templates.includes(
                                            tpl,
                                        )}
                                        onCheckedChange={() =>
                                            toggleDraftTemplate(tpl)
                                        }
                                    />
                                    {t(
                                        `app.test_cases.templates.${TEMPLATE_KEYS[tpl]}`,
                                    )}
                                </label>
                            ))}
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('app.test_cases.filters.section')}</Label>
                            <Select
                                value={
                                    draftFilters.sectionId === null
                                        ? 'all'
                                        : String(draftFilters.sectionId)
                                }
                                onValueChange={(v) =>
                                    setDraftFilters((f) => ({
                                        ...f,
                                        sectionId:
                                            v === 'all' ? null : Number(v),
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('app.test_cases.filters.all')}
                                    </SelectItem>
                                    {flatSections.map((s) => (
                                        <SelectItem
                                            key={s.id}
                                            value={String(s.id)}
                                        >
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>
                                {t('app.test_cases.filters.has_requirements')}
                            </Label>
                            <Select
                                value={
                                    draftFilters.hasRequirements === null
                                        ? 'all'
                                        : draftFilters.hasRequirements
                                          ? 'yes'
                                          : 'no'
                                }
                                onValueChange={(v) =>
                                    setDraftFilters((f) => ({
                                        ...f,
                                        hasRequirements:
                                            v === 'all' ? null : v === 'yes',
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('app.test_cases.filters.all')}
                                    </SelectItem>
                                    <SelectItem value="yes">
                                        {t('app.test_cases.filters.yes')}
                                    </SelectItem>
                                    <SelectItem value="no">
                                        {t('app.test_cases.filters.no')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <SheetFooter className="flex-row gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={clearFilters}
                        >
                            {t('app.test_cases.filters.clear')}
                        </Button>
                        <Button className="flex-1" onClick={applyFilters}>
                            {t('app.test_cases.filters.apply')}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* ── Bulk edit sheet ────────────────────────────────────────────── */}
            <Sheet open={bulkOpen} onOpenChange={setBulkOpen}>
                <SheetContent className="flex flex-col">
                    <SheetHeader>
                        <SheetTitle>
                            {t('app.test_cases.bulk.title', {
                                count: String(selectedIds.size),
                            })}
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 space-y-4 overflow-y-auto px-4">
                        <div className="grid gap-2">
                            <Label>{t('app.test_cases.fields.priority')}</Label>
                            <Select
                                value={bulkPriority || 'keep'}
                                onValueChange={(v) =>
                                    setBulkPriority(v === 'keep' ? '' : v)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="keep">—</SelectItem>
                                    {PRIORITY_OPTIONS.map((p) => (
                                        <SelectItem
                                            key={p}
                                            value={PRIORITY_KEYS[p]}
                                        >
                                            {t(
                                                `app.requirements.priorities.${PRIORITY_KEYS[p]}`,
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('app.test_cases.fields.section')}</Label>
                            <Select
                                value={bulkSection || 'keep'}
                                onValueChange={(v) =>
                                    setBulkSection(v === 'keep' ? '' : v)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="keep">—</SelectItem>
                                    {flatSections.map((s) => (
                                        <SelectItem
                                            key={s.id}
                                            value={String(s.id)}
                                        >
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('app.test_cases.fields.type')}</Label>
                            <Input
                                value={bulkType}
                                onChange={(e) => setBulkType(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('app.test_cases.bulk.note')}
                        </p>
                    </div>
                    <SheetFooter className="flex-row gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setBulkOpen(false)}
                        >
                            {t('app.common.cancel')}
                        </Button>
                        <Button className="flex-1" onClick={submitBulkEdit}>
                            {t('app.test_cases.bulk.apply', {
                                count: String(selectedIds.size),
                            })}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
}

SuitesShow.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
