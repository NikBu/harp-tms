import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Download,
    Filter,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
    DropdownMenuContent,
    DropdownMenuItem,
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
import { edit as editSuite } from '@/actions/App/Http/Controllers/SuiteController';
import {
    bulkDestroy,
    bulkUpdate,
    show as showCase,
} from '@/actions/App/Http/Controllers/TestCaseController';
import { index as projectsIndex } from '@/routes/projects';

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

type SectionDialogState =
    | {
          mode: 'create';
          parentId: number | null;
          suiteId: number;
          projectId: number;
      }
    | { mode: 'edit'; section: Section }
    | null;

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
    ) {
        return false;
    }

    if (f.templates.length > 0 && !f.templates.includes(c.template)) {
        return false;
    }

    if (f.sectionId !== null && c.section_id !== f.sectionId) {
        return false;
    }

    if (
        f.hasRequirements !== null &&
        c.has_requirements !== f.hasRequirements
    ) {
        return false;
    }

    return true;
}

function flattenSections(sections: Section[]): Section[] {
    return sections.flatMap((s) => [s, ...flattenSections(s.children ?? [])]);
}

export default function SuitesShow({
    suite,
    sections,
}: {
    suite: Suite;
    sections: Section[];
}) {
    const t = useTrans();
    const [dialog, setDialog] = useState<SectionDialogState>(null);
    const [name, setName] = useState('');
    const [subsectionOpen, setSubsectionOpen] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkPriority, setBulkPriority] = useState('');
    const [bulkSection, setBulkSection] = useState('');
    const [bulkType, setBulkType] = useState('');

    const flatSections = useMemo(() => flattenSections(sections), [sections]);

    const activeFilterCount =
        filters.priorities.length +
        filters.templates.length +
        (filters.sectionId !== null ? 1 : 0) +
        (filters.hasRequirements !== null ? 1 : 0);

    // ── Section dialog helpers ────────────────────────────────────────────────

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

    // ── Selection helpers ──────────────────────────────────────────────────────

    function toggleCase(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function deleteSelected() {
        if (
            selectedIds.size === 0 ||
            !window.confirm(t('app.common.confirm_delete'))
        ) {
            return;
        }

        router.delete(bulkDestroy.url(), {
            data: { ids: Array.from(selectedIds) },
            preserveScroll: true,
            onSuccess: () => setSelectedIds(new Set()),
        });
    }

    // ── Filter helpers ──────────────────────────────────────────────────────────

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

    // ── Bulk edit helpers ────────────────────────────────────────────────────────

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

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="grid gap-1">
                        <h1 className="text-2xl font-semibold">{suite.name}</h1>
                        {suite.description ? (
                            <p className="text-sm text-muted-foreground">
                                {suite.description}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={openFilters}
                        >
                            <Filter className="mr-1 size-4" />
                            {t('app.test_cases.toolbar.filter')}
                            {activeFilterCount > 0 ? (
                                <Badge className="ml-1">
                                    {activeFilterCount}
                                </Badge>
                            ) : null}
                        </Button>

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

                        <Button variant="outline" size="sm" asChild>
                            <Link href={editSuite.url(suite.id)}>
                                <Pencil className="mr-1 size-4" />
                                {t('app.common.edit')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {selectedIds.size > 0 ? (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                        <span className="text-sm">
                            {selectedIds.size} {t('app.runs.bulk.selected')}
                        </span>
                        <div className="ml-auto flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBulkOpen(true)}
                            >
                                {t('app.test_cases.toolbar.edit_selected')}
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={deleteSelected}
                            >
                                {t('app.test_cases.toolbar.delete_selected')}
                            </Button>
                        </div>
                    </div>
                ) : null}

                <Card>
                    <CardContent className="grid gap-2">
                        <h2 className="text-lg font-medium">
                            {t('app.sections.title')}
                        </h2>

                        {sections.length === 0 ? (
                            <p className="py-4 text-sm text-muted-foreground">
                                {t('app.sections.empty')}
                            </p>
                        ) : (
                            <div className="grid gap-2">
                                {sections.map((section) => (
                                    <SectionRow
                                        key={section.id}
                                        section={section}
                                        depth={0}
                                        filters={filters}
                                        selectedIds={selectedIds}
                                        onToggleCase={toggleCase}
                                        onAddChild={openCreate}
                                        onEdit={openEdit}
                                        onDelete={deleteSection}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => openCreate(null)}
                            >
                                <Plus className="size-4" />
                                {t('app.sections.add')}
                            </Button>
                            {flatSections.length > 0 ? (
                                <Button
                                    variant="outline"
                                    onClick={() => setSubsectionOpen(true)}
                                >
                                    <Plus className="size-4" />
                                    {t('app.sections.add_subsection')}
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Section create/edit dialog */}
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

            {/* Add subsection — parent picker */}
            <Dialog open={subsectionOpen} onOpenChange={setSubsectionOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('app.sections.add_subsection')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label>{t('app.sections.parent_section')}</Label>
                        <Select
                            onValueChange={(val) => {
                                setSubsectionOpen(false);
                                openCreate(Number(val));
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={t(
                                        'app.sections.select_parent',
                                    )}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {flatSections.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Filter panel */}
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

            {/* Bulk edit sheet */}
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

function SectionRow({
    section,
    depth,
    filters,
    selectedIds,
    onToggleCase,
    onAddChild,
    onEdit,
    onDelete,
}: {
    section: Section;
    depth: number;
    filters: Filters;
    selectedIds: Set<number>;
    onToggleCase: (id: number) => void;
    onAddChild: (parentId: number) => void;
    onEdit: (section: Section) => void;
    onDelete: (section: Section) => void;
}) {
    const t = useTrans();

    const cases = (section.testCases ?? []).filter((c) =>
        caseMatches(c, filters),
    );

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

            {cases.length > 0 ? (
                <div
                    className="overflow-hidden rounded-md border"
                    style={{ marginLeft: `${(depth + 1) * 1.5}rem` }}
                >
                    <table className="w-full text-sm">
                        <tbody>
                            {cases.map((c) => (
                                <tr
                                    key={c.id}
                                    className="border-b last:border-0 hover:bg-muted/40"
                                >
                                    <td className="w-10 px-3 py-2">
                                        <Checkbox
                                            checked={selectedIds.has(c.id)}
                                            onCheckedChange={() =>
                                                onToggleCase(c.id)
                                            }
                                        />
                                    </td>
                                    <td className="px-3 py-2 font-medium">
                                        <Link
                                            href={showCase.url(c.id)}
                                            className="hover:text-primary hover:underline"
                                        >
                                            {c.title}
                                        </Link>
                                    </td>
                                    <td className="w-28 px-3 py-2">
                                        {c.priority_id ? (
                                            <span
                                                className={`text-xs capitalize ${PRIORITY_COLORS[c.priority_id] ?? ''}`}
                                            >
                                                {t(
                                                    `app.requirements.priorities.${PRIORITY_KEYS[c.priority_id]}`,
                                                )}
                                            </span>
                                        ) : null}
                                    </td>
                                    <td className="w-28 px-3 py-2 text-xs text-muted-foreground">
                                        {t(
                                            `app.test_cases.templates.${TEMPLATE_KEYS[c.template] ?? 'steps'}`,
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}

            {(section.children ?? []).map((child) => (
                <SectionRow
                    key={child.id}
                    section={child}
                    depth={depth + 1}
                    filters={filters}
                    selectedIds={selectedIds}
                    onToggleCase={onToggleCase}
                    onAddChild={onAddChild}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </>
    );
}

SuitesShow.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
