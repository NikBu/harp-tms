import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownAZ,
    ArrowUpAZ,
    ChevronDown,
    ChevronRight,
    Columns3,
    Filter,
    Pencil,
    Plus,
    SlidersHorizontal,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import {
    destroy as destroySection,
    store as storeSection,
    update as updateSection,
} from '@/actions/App/Http/Controllers/SectionController';
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
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project, Section, Suite } from '@/types';

type SuiteWithSections = Suite & { sections: Section[] };

type SectionDialogState =
    | { mode: 'create'; parentId: number | null; suiteId: number; projectId: number }
    | { mode: 'edit'; section: Section }
    | null;

type SortField = 'section' | 'title' | 'priority' | 'type' | 'created_by';

type ColumnKey = 'id' | 'title' | 'priority' | 'type' | 'estimate' | 'references';

const SORT_FIELDS: SortField[] = ['section', 'title', 'priority', 'type', 'created_by'];

const COLUMN_KEYS: ColumnKey[] = ['id', 'title', 'priority', 'type', 'estimate', 'references'];

function SectionRow({
    section,
    depth,
    collapsed,
    onAddChild,
    onEdit,
    onDelete,
}: {
    section: Section;
    depth: number;
    collapsed: boolean;
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

            {!collapsed &&
                (section.children ?? []).map((child) => (
                    <SectionRow
                        key={child.id}
                        section={child}
                        depth={depth + 1}
                        collapsed={collapsed}
                        onAddChild={onAddChild}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
        </>
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

    // ── Toolbar state (frontend-only) ──────────────────────────────────────
    const [sortField, setSortField] = useState<SortField>('section');
    const [sortAsc, setSortAsc] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);
    const [columns, setColumns] = useState<Record<ColumnKey, boolean>>({
        id: true,
        title: true,
        priority: true,
        type: true,
        estimate: false,
        references: false,
    });
    const [selected] = useState<number[]>([]);

    function openCreate(parentId: number | null) {
        setName('');
        setDialog({ mode: 'create', parentId, suiteId: suite.id, projectId: suite.project_id });
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
        if (!window.confirm(t('app.common.confirm_delete'))) {
            return;
        }

        router.delete(destroySection.url(section.id), {
            preserveScroll: true,
        });
    }

    const createCaseHref = `/suites/${suite.id}/cases/create`;
    const addSectionHref = `/suites/${suite.id}?action=add_section`;

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

                {/* ── Toolbar ──────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
                    {/* Left controls */}
                    <div className="flex flex-wrap items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <SlidersHorizontal className="size-3.5" />
                                    {t('app.common.sort')}: {t(`app.cases.sort.${sortField}`)}
                                    <ChevronDown className="size-3 opacity-60" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>{t('app.common.sort')}</DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={sortField}
                                    onValueChange={(v) => setSortField(v as SortField)}
                                >
                                    {SORT_FIELDS.map((f) => (
                                        <DropdownMenuRadioItem key={f} value={f}>
                                            {t(`app.cases.sort.${f}`)}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setSortAsc((v) => !v)}
                            title={sortAsc ? t('app.cases.sort_asc') : t('app.cases.sort_desc')}
                        >
                            {sortAsc ? (
                                <ArrowUpAZ className="size-4" />
                            ) : (
                                <ArrowDownAZ className="size-4" />
                            )}
                        </Button>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <Filter className="size-3.5" />
                                    {t('app.common.filter')}: {t('app.common.none')}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('app.cases.filters_soon')}</TooltipContent>
                        </Tooltip>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCollapsed((v) => !v)}
                        >
                            {collapsed ? t('app.common.expand_all') : t('app.common.collapse_all')}
                        </Button>

                        <Toggle
                            size="sm"
                            pressed={showDeleted}
                            onPressedChange={setShowDeleted}
                            className="gap-1.5 text-xs"
                        >
                            {t('app.cases.display_deleted')}
                        </Toggle>
                        {showDeleted && (
                            <Badge variant="secondary" className="text-xs">
                                {t('app.cases.deleted_shown')}
                            </Badge>
                        )}
                    </div>

                    {/* Right controls */}
                    <div className="ml-auto flex flex-wrap items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="gap-1.5">
                                    <Plus className="size-3.5" />
                                    {t('app.cases.add_case')}
                                    <ChevronDown className="size-3 opacity-70" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={createCaseHref}>
                                        {t('app.test_cases.create')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={addSectionHref}>
                                        {t('app.sections.add')}
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <UserPlus className="size-3.5" />
                                    {t('app.common.assign_to')}
                                    <ChevronDown className="size-3 opacity-60" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled>
                                    {t('app.cases.feature_soon')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <Pencil className="size-3.5" />
                                    {t('app.common.edit')}
                                    <ChevronDown className="size-3 opacity-60" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem disabled={selected.length === 0}>
                                    {t('app.cases.edit_selected')}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    {t('app.cases.edit_all')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={selected.length === 0}
                        >
                            <Trash2 className="size-3.5" />
                            {t('app.common.delete')}
                            {selected.length > 0 && ` (${selected.length})`}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <Columns3 className="size-3.5" />
                                    {t('app.common.columns')}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('app.common.columns')}</DropdownMenuLabel>
                                {COLUMN_KEYS.map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col}
                                        checked={columns[col]}
                                        onCheckedChange={(checked) =>
                                            setColumns((prev) => ({ ...prev, [col]: !!checked }))
                                        }
                                    >
                                        {t(`app.cases.columns.${col}`)}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                                        collapsed={collapsed}
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

                        {/* Visible columns indicator (frontend column toggles) */}
                        <div className="flex flex-wrap items-center gap-1 pt-1 text-xs text-muted-foreground">
                            <Checkbox checked disabled className="invisible size-0" />
                            <span>{t('app.common.columns')}:</span>
                            {COLUMN_KEYS.filter((c) => columns[c]).map((c) => (
                                <Badge key={c} variant="outline" className="text-xs">
                                    {t(`app.cases.columns.${c}`)}
                                </Badge>
                            ))}
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
        { title: 'Projects', href: projectsIndex() },
    ],
};
