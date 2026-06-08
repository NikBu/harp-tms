import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownUp,
    ChevronDown,
    ChevronRight,
    Columns3,
    Filter,
    Pencil,
    Plus,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    destroy as destroySection,
    store as storeSection,
    update as updateSection,
} from '@/actions/App/Http/Controllers/SectionController';
import {
    create as createCase,
    destroy as destroyCase,
} from '@/actions/App/Http/Controllers/TestCaseController';
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
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Section, Suite } from '@/types';
import type { TestCase } from '@/types/test-case';

/**
 * The suite/show endpoint loads sections with their `children`. When the
 * backend also eager-loads `testCases`, the toolbar operates on them; until
 * then the case-aware controls simply work against an empty set.
 */
type SectionWithCases = Section & {
    testCases?: TestCase[];
    children?: SectionWithCases[];
};

type SuiteWithSections = Suite & { sections: SectionWithCases[] };

type SectionDialogState =
    | {
          mode: 'create';
          parentId: number | null;
          suiteId: number;
          projectId: number;
      }
    | { mode: 'edit'; section: Section }
    | null;

type SortField = 'id' | 'title' | 'priority' | 'type' | 'estimate';
type SortDir = 'asc' | 'desc';

type ColumnKey = 'priority' | 'type' | 'estimate' | 'references';

const COLUMN_KEYS: ColumnKey[] = ['priority', 'type', 'estimate', 'references'];

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
    priority: true,
    type: true,
    estimate: true,
    references: true,
};

const PRIORITY_KEYS: Record<number, string> = {
    1: 'critical',
    2: 'high',
    3: 'medium',
    4: 'low',
};

function columnsStorageKey(suiteId: number): string {
    return `harp_suite_columns_${suiteId}`;
}

function loadColumns(suiteId: number): Record<ColumnKey, boolean> {
    if (typeof window === 'undefined') {
        return { ...DEFAULT_COLUMNS };
    }

    try {
        const raw = window.localStorage.getItem(columnsStorageKey(suiteId));

        if (!raw) {
            return { ...DEFAULT_COLUMNS };
        }

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

/** Leading numeric value of an estimate string ("2h 30m" → 2); nulls sort last. */
function estimateValue(estimate: string | null): number {
    if (estimate === null) {
        return Number.POSITIVE_INFINITY;
    }

    const match = estimate.match(/\d+/);

    return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function sortCases(
    cases: TestCase[],
    field: SortField,
    dir: SortDir,
): TestCase[] {
    const sorted = [...cases].sort((a, b) => {
        let comparison = 0;

        switch (field) {
            case 'id':
                comparison = a.id - b.id;
                break;
            case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
            case 'priority':
                comparison =
                    (a.priority_id ?? Number.POSITIVE_INFINITY) -
                    (b.priority_id ?? Number.POSITIVE_INFINITY);
                break;
            case 'type':
                comparison = (a.type_id ?? '').localeCompare(b.type_id ?? '');
                break;
            case 'estimate':
                comparison =
                    estimateValue(a.estimate) - estimateValue(b.estimate);
                break;
        }

        return dir === 'asc' ? comparison : -comparison;
    });

    return sorted;
}

function collectCases(sections: SectionWithCases[]): TestCase[] {
    return sections.flatMap((section) => [
        ...(section.testCases ?? []),
        ...collectCases(section.children ?? []),
    ]);
}

function SectionRow({
    section,
    depth,
    collapsed,
    sortField,
    sortDir,
    visibleCols,
    selectedIds,
    onToggleCollapse,
    onToggleSelect,
    onAddChild,
    onEdit,
    onDelete,
}: {
    section: SectionWithCases;
    depth: number;
    collapsed: Set<number>;
    sortField: SortField;
    sortDir: SortDir;
    visibleCols: Record<ColumnKey, boolean>;
    selectedIds: Set<number>;
    onToggleCollapse: (sectionId: number) => void;
    onToggleSelect: (id: number, checked: boolean) => void;
    onAddChild: (parentId: number) => void;
    onEdit: (section: Section) => void;
    onDelete: (section: Section) => void;
}) {
    const t = useTrans();
    const isCollapsed = collapsed.has(section.id);
    const cases = sortCases(section.testCases ?? [], sortField, sortDir);

    return (
        <>
            <div
                className="flex items-center justify-between gap-2 rounded-md border p-3"
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
                </button>
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

            {!isCollapsed && cases.length > 0 ? (
                <div
                    className="overflow-x-auto rounded-md border"
                    style={{ marginLeft: `${(depth + 1) * 1.5}rem` }}
                >
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="w-10 px-3 py-2" />
                                <th className="px-3 py-2 font-medium">
                                    {t('app.test_cases.fields.title')}
                                </th>
                                {visibleCols.priority ? (
                                    <th className="px-3 py-2 font-medium">
                                        {t('app.test_cases.fields.priority')}
                                    </th>
                                ) : null}
                                {visibleCols.type ? (
                                    <th className="px-3 py-2 font-medium">
                                        {t('app.test_cases.fields.type')}
                                    </th>
                                ) : null}
                                {visibleCols.estimate ? (
                                    <th className="px-3 py-2 font-medium">
                                        {t('app.test_cases.fields.estimate')}
                                    </th>
                                ) : null}
                                {visibleCols.references ? (
                                    <th className="px-3 py-2 font-medium">
                                        {t('app.test_cases.fields.references')}
                                    </th>
                                ) : null}
                            </tr>
                        </thead>
                        <tbody>
                            {cases.map((testCase) => (
                                <tr
                                    key={testCase.id}
                                    className="border-b last:border-0 hover:bg-muted/50"
                                >
                                    <td className="px-3 py-2">
                                        <Checkbox
                                            checked={selectedIds.has(
                                                testCase.id,
                                            )}
                                            onCheckedChange={(checked) =>
                                                onToggleSelect(
                                                    testCase.id,
                                                    checked === true,
                                                )
                                            }
                                            aria-label={testCase.title}
                                        />
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                        {testCase.title}
                                    </td>
                                    {visibleCols.priority ? (
                                        <td className="px-3 py-2">
                                            {testCase.priority_id ? (
                                                <Badge variant="outline">
                                                    {
                                                        PRIORITY_KEYS[
                                                            testCase.priority_id
                                                        ]
                                                    }
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                    ) : null}
                                    {visibleCols.type ? (
                                        <td className="px-3 py-2 text-muted-foreground">
                                            {testCase.type_id ?? '—'}
                                        </td>
                                    ) : null}
                                    {visibleCols.estimate ? (
                                        <td className="px-3 py-2 text-muted-foreground">
                                            {testCase.estimate ?? '—'}
                                        </td>
                                    ) : null}
                                    {visibleCols.references ? (
                                        <td className="px-3 py-2 text-muted-foreground">
                                            {testCase.references ?? '—'}
                                        </td>
                                    ) : null}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}

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
                          selectedIds={selectedIds}
                          onToggleCollapse={onToggleCollapse}
                          onToggleSelect={onToggleSelect}
                          onAddChild={onAddChild}
                          onEdit={onEdit}
                          onDelete={onDelete}
                      />
                  ))
                : null}
        </>
    );
}

export default function SuitesShow({ suite }: { suite: SuiteWithSections }) {
    const t = useTrans();
    const [dialog, setDialog] = useState<SectionDialogState>(null);
    const [name, setName] = useState('');

    const [sortField, setSortField] = useState<SortField>('id');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
    const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>(
        () => loadColumns(suite.id),
    );

    const allCases = useMemo(
        () => collectCases(suite.sections),
        [suite.sections],
    );

    function allSectionIds(sections: SectionWithCases[]): number[] {
        return sections.flatMap((section) => [
            section.id,
            ...allSectionIds(section.children ?? []),
        ]);
    }

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(
            columnsStorageKey(suite.id),
            JSON.stringify(visibleCols),
        );
    }, [suite.id, visibleCols]);

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

        if (dialog === null) {
            return;
        }

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
        if (!window.confirm(t('app.common.confirm_delete'))) {
            return;
        }

        router.delete(destroySection.url(section.id), {
            preserveScroll: true,
        });
    }

    function toggleCollapse(sectionId: number) {
        setCollapsed((current) => {
            const next = new Set(current);

            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }

            return next;
        });
    }

    const allCollapsed =
        suite.sections.length > 0 &&
        allSectionIds(suite.sections).every((id) => collapsed.has(id));

    function toggleCollapseAll() {
        if (allCollapsed) {
            setCollapsed(new Set());
        } else {
            setCollapsed(new Set(allSectionIds(suite.sections)));
        }
    }

    function toggleSelect(id: number, checked: boolean) {
        setSelectedIds((current) => {
            const next = new Set(current);

            if (checked) {
                next.add(id);
            } else {
                next.delete(id);
            }

            return next;
        });
    }

    const allSelected =
        allCases.length > 0 && allCases.every((c) => selectedIds.has(c.id));

    function toggleSelectAll(checked: boolean) {
        setSelectedIds(
            checked ? new Set(allCases.map((c) => c.id)) : new Set(),
        );
    }

    function editSelected() {
        if (selectedIds.size === 0) {
            toast.info(t('app.test_cases.toolbar.select_cases_first'));

            return;
        }

        toast.info(t('app.test_cases.toolbar.bulk_edit_not_implemented'));
    }

    function deleteSelected() {
        if (selectedIds.size === 0) {
            toast.info(t('app.test_cases.toolbar.select_cases_first'));

            return;
        }

        if (
            !window.confirm(
                t('app.test_cases.toolbar.delete_confirm', {
                    count: String(selectedIds.size),
                }),
            )
        ) {
            return;
        }

        selectedIds.forEach((id) => {
            router.delete(destroyCase.url(id), { preserveScroll: true });
        });

        setSelectedIds(new Set());
    }

    return (
        <>
            <Head title={suite.name} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">{suite.name}</h1>
                    {suite.description ? (
                        <p className="text-sm text-muted-foreground">
                            {suite.description}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1 border-b pb-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <ArrowDownUp className="size-4" />
                                {t('app.test_cases.toolbar.sort_by')}
                                <ChevronDown className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuCheckboxItem
                                checked={sortField === 'id'}
                                onCheckedChange={() => setSortField('id')}
                            >
                                {t('app.test_cases.toolbar.sort_id')}
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={sortField === 'title'}
                                onCheckedChange={() => setSortField('title')}
                            >
                                {t('app.test_cases.toolbar.sort_title')}
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={sortField === 'priority'}
                                onCheckedChange={() => setSortField('priority')}
                            >
                                {t('app.test_cases.toolbar.sort_priority')}
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={sortField === 'type'}
                                onCheckedChange={() => setSortField('type')}
                            >
                                {t('app.test_cases.toolbar.sort_type')}
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={sortField === 'estimate'}
                                onCheckedChange={() => setSortField('estimate')}
                            >
                                {t('app.test_cases.toolbar.sort_estimate')}
                            </DropdownMenuCheckboxItem>
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

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Filter className="size-4" />
                                {t('app.test_cases.toolbar.filter')}
                                <ChevronDown className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuLabel>
                                {t('app.test_cases.toolbar.no_filters')}
                            </DropdownMenuLabel>
                        </DropdownMenuContent>
                    </DropdownMenu>

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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Plus className="size-4" />
                                    {t('app.test_cases.toolbar.add_case')}
                                    <ChevronDown className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={createCase.url(suite.id)}>
                                        {t('app.test_cases.toolbar.add_case')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => openCreate(null)}
                                >
                                    {t('app.test_cases.toolbar.add_section')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => openCreate(null)}
                                >
                                    {t('app.test_cases.toolbar.add_subsection')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <UserPlus className="size-4" />
                                    {t('app.test_cases.toolbar.assign_to')}
                                    <ChevronDown className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onSelect={() =>
                                        toast.info(
                                            t(
                                                'app.test_cases.toolbar.assign_not_implemented',
                                            ),
                                        )
                                    }
                                >
                                    {t(
                                        'app.test_cases.toolbar.assign_not_implemented',
                                    )}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={editSelected}
                        >
                            <Pencil className="size-4" />
                            {t('app.test_cases.toolbar.edit_selected')}
                            {selectedIds.size > 0 ? (
                                <Badge variant="secondary">
                                    {selectedIds.size}
                                </Badge>
                            ) : null}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={deleteSelected}
                        >
                            <Trash2 className="size-4" />
                            {t('app.test_cases.toolbar.delete_selected')}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Columns3 className="size-4" />
                                    {t('app.test_cases.toolbar.columns')}
                                    <ChevronDown className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {COLUMN_KEYS.map((key) => (
                                    <DropdownMenuCheckboxItem
                                        key={key}
                                        checked={visibleCols[key]}
                                        onCheckedChange={(checked) =>
                                            setVisibleCols((current) => ({
                                                ...current,
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
                            />
                            <h2 className="text-lg font-medium">
                                {t('app.sections.title')}
                            </h2>
                        </div>

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
                                        collapsed={collapsed}
                                        sortField={sortField}
                                        sortDir={sortDir}
                                        visibleCols={visibleCols}
                                        selectedIds={selectedIds}
                                        onToggleCollapse={toggleCollapse}
                                        onToggleSelect={toggleSelect}
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
