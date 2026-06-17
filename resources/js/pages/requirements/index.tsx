import { Head, Link } from '@inertiajs/react';
import { BookOpen, FolderOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project } from '@/types';
import type {
    Requirement,
    RequirementFolder,
    RequirementPriority,
    RequirementStatus,
    RequirementType,
} from '@/types/requirement';

const TYPE_BADGE: Record<RequirementType, string> = {
    functional:     'bg-blue-100 text-blue-700 border-blue-200',
    non_functional: 'bg-purple-100 text-purple-700 border-purple-200',
    business:       'bg-orange-100 text-orange-700 border-orange-200',
    constraint:     'bg-slate-100 text-slate-600 border-slate-200',
    user_story:     'bg-teal-100 text-teal-700 border-teal-200',
};

const PRIORITY_BADGE: Record<RequirementPriority, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high:     'bg-orange-100 text-orange-700 border-orange-200',
    medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    low:      'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_BADGE: Record<RequirementStatus, string> = {
    draft:        'bg-slate-100 text-slate-600 border-slate-200',
    under_review: 'bg-blue-100 text-blue-700 border-blue-200',
    approved:     'bg-green-100 text-green-700 border-green-200',
    obsolete:     'bg-gray-100 text-gray-500 border-gray-200',
};

function FolderTree({
    folders,
    selectedFolderId,
    onSelect,
    allLabel,
}: {
    folders: RequirementFolder[];
    selectedFolderId: number | null;
    onSelect: (id: number | null) => void;
    allLabel: string;
}) {
    return (
        <div className="grid gap-0.5">
            <button
                type="button"
                onClick={() => onSelect(null)}
                className={`rounded px-2 py-1.5 text-left text-sm transition-colors ${
                    selectedFolderId === null ? 'bg-accent font-medium' : 'hover:bg-muted'
                }`}
            >
                {allLabel}
            </button>
            {folders.map((folder) => (
                <div key={folder.id}>
                    <button
                        type="button"
                        onClick={() => onSelect(folder.id)}
                        className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                            selectedFolderId === folder.id ? 'bg-accent font-medium' : 'hover:bg-muted'
                        }`}
                    >
                        <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{folder.name}</span>
                    </button>
                    {(folder.children ?? []).length > 0 && (
                        <div className="ml-3 border-l pl-2">
                            <FolderTree
                                folders={folder.children!}
                                selectedFolderId={selectedFolderId}
                                onSelect={onSelect}
                                allLabel={allLabel}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function RequirementRow({
    req,
    t,
    showProject,
}: {
    req: Requirement;
    t: (k: string) => string;
    showProject?: boolean;
}) {
    return (
        <Link
            href={`/requirements/${req.id}`}
            className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 transition-colors hover:border-primary"
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {req.display_id}
                    </span>
                    <span className="truncate text-sm font-medium">{req.title}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {showProject && req.project && (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                            {req.project.name}
                        </span>
                    )}
                    {req.assignedTo && <span>{req.assignedTo.name}</span>}
                </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {req.type && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${TYPE_BADGE[req.type]}`}>
                        {t(`requirements.types.${req.type}`)}
                    </span>
                )}
                {req.priority && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_BADGE[req.priority]}`}>
                        {t(`requirements.priorities.${req.priority}`)}
                    </span>
                )}
                {req.status && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[req.status]}`}>
                        {t(`requirements.statuses.${req.status}`)}
                    </span>
                )}
            </div>
        </Link>
    );
}

export default function RequirementsIndex({
    project,
    folders,
    requirements,
    types,
    priorities,
    statuses,
    isGlobal = false,
}: {
    project: Project | null;
    folders: RequirementFolder[];
    requirements: Requirement[];
    types: string[];
    priorities: string[];
    statuses: string[];
    isGlobal?: boolean;
}) {
    const t = useTrans();

    const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
    const [filterType, setFilterType]         = useState<string>('all');
    const [filterStatus, setFilterStatus]     = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');

    function flattenFolderReqs(fs: RequirementFolder[]): Requirement[] {
        return fs.flatMap((f) => [
            ...(f.requirements ?? []),
            ...flattenFolderReqs(f.children ?? []),
        ]);
    }

    const allReqs: Requirement[] = selectedFolder === null
        ? [...requirements, ...flattenFolderReqs(folders)]
        : flattenFolderReqs(
            folders.filter((f) => f.id === selectedFolder || f.children?.some((c) => c.id === selectedFolder)),
          ).filter((r) => r.folder_id === selectedFolder);

    const filtered = allReqs.filter((r) => {
        if (filterType     !== 'all' && r.type     !== filterType)     return false;
        if (filterStatus   !== 'all' && r.status   !== filterStatus)   return false;
        if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
        return true;
    });

    return (
        <>
            <Head title={t('requirements.title')} />

            <div className="flex h-full flex-1 gap-0 overflow-hidden">

                {!isGlobal && (
                    <aside className="hidden w-56 shrink-0 overflow-y-auto border-r p-3 lg:block">
                        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('requirements.folders')}
                        </p>
                        <FolderTree
                            folders={folders}
                            selectedFolderId={selectedFolder}
                            onSelect={setSelectedFolder}
                            allLabel={t('requirements.all')}
                        />
                    </aside>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">

                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <BookOpen className="size-5 text-muted-foreground" />
                            <h1 className="text-2xl font-semibold">{t('requirements.title')}</h1>
                            <Badge variant="secondary">{filtered.length}</Badge>
                        </div>
                        {!isGlobal && project && (
                            <Button asChild>
                                <Link href={`/projects/${project.id}/requirements/create`}>
                                    <Plus className="size-4" />
                                    {t('requirements.create')}
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="h-8 w-40 text-xs">
                                <SelectValue placeholder={t('requirements.filters.all_types')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('requirements.filters.all_types')}</SelectItem>
                                {types.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {t(`requirements.types.${type}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-8 w-40 text-xs">
                                <SelectValue placeholder={t('requirements.filters.all_statuses')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('requirements.filters.all_statuses')}</SelectItem>
                                {statuses.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {t(`requirements.statuses.${status}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                            <SelectTrigger className="h-8 w-40 text-xs">
                                <SelectValue placeholder={t('requirements.filters.all_priorities')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('requirements.filters.all_priorities')}</SelectItem>
                                {priorities.map((priority) => (
                                    <SelectItem key={priority} value={priority}>
                                        {t(`requirements.priorities.${priority}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
                            <BookOpen className="size-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t('requirements.empty')}</p>
                            {!isGlobal && project && (
                                <Button asChild className="mt-2">
                                    <Link href={`/projects/${project.id}/requirements/create`}>
                                        <Plus className="size-4" />
                                        {t('requirements.create')}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {filtered.map((req) => (
                                <RequirementRow
                                    key={req.id}
                                    req={req}
                                    t={t}
                                    showProject={isGlobal}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

RequirementsIndex.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Requirements' },
    ],
};