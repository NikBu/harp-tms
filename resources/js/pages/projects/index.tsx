import { Head, Link, router } from '@inertiajs/react';
import { FolderOpen, LayoutGrid, List, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTrans } from '@/hooks/use-trans';
import {
    create as projectsCreate,
    index as projectsIndex,
    show as projectsShow,
} from '@/routes/projects';
import type { PaginatedProjects, Project, SuiteMode } from '@/types';

type ViewMode = 'grid' | 'list';

function SuiteModeBadge({ mode }: { mode: SuiteMode }) {
    const t = useTrans();
    const labels: Record<SuiteMode, string> = {
        1: t('app.projects.suite_mode_single'),
        2: t('app.projects.suite_mode_single_baseline'),
        3: t('app.projects.suite_mode_multi'),
    };

    return <Badge variant="secondary">{labels[mode]}</Badge>;
}

function ProjectCard({ project, view }: { project: Project; view: ViewMode }) {
    const t = useTrans();

    if (view === 'list') {
        return (
            <Link
                href={projectsShow(project.id).url}
                className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary hover:bg-accent/40"
            >
                <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-medium">
                    {project.name}
                </span>
                {project.description ? (
                    <span className="hidden truncate text-sm text-muted-foreground sm:block sm:max-w-xs lg:max-w-sm">
                        {project.description}
                    </span>
                ) : null}
                <div className="flex shrink-0 items-center gap-2">
                    {project.is_completed ? (
                        <Badge variant="outline">{t('app.projects.completed')}</Badge>
                    ) : null}
                    <SuiteModeBadge mode={project.suite_mode} />
                </div>
            </Link>
        );
    }

    return (
        <Link href={projectsShow(project.id).url} className="block">
            <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className="truncate">
                            {project.name}
                        </CardTitle>
                        <SuiteModeBadge mode={project.suite_mode} />
                    </div>
                    <CardDescription className="line-clamp-2">
                        {project.description ?? ''}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    {project.is_completed ? (
                        <Badge variant="outline">
                            {t('app.projects.completed')}
                        </Badge>
                    ) : null}
                </CardContent>
            </Card>
        </Link>
    );
}

export default function ProjectsIndex({
    projects,
}: {
    projects: PaginatedProjects;
}) {
    const t = useTrans();
    const [view, setView] = useState<ViewMode>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('projects-view') as ViewMode) ?? 'grid';
        }
        return 'grid';
    });

    const changeView = (v: ViewMode) => {
        setView(v);
        localStorage.setItem('projects-view', v);
    };

    return (
        <>
            <Head title={t('app.projects.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">
                        {t('app.projects.title')}
                    </h1>
                    <div className="flex items-center gap-2">
                        {/* View toggle */}
                        <div className="flex items-center rounded-md border border-border">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    'h-8 w-8 rounded-r-none',
                                    view === 'grid' && 'bg-muted text-foreground',
                                )}
                                onClick={() => changeView('grid')}
                                title="Grid view"
                            >
                                <LayoutGrid className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    'h-8 w-8 rounded-l-none border-l border-border',
                                    view === 'list' && 'bg-muted text-foreground',
                                )}
                                onClick={() => changeView('list')}
                                title="List view"
                            >
                                <List className="size-4" />
                            </Button>
                        </div>

                        <Button asChild>
                            <Link href={projectsCreate().url}>
                                <Plus className="size-4" />
                                {t('app.projects.create')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {projects.data.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
                        <FolderOpen className="size-10 text-muted-foreground" />
                        <h2 className="text-lg font-medium">
                            {t('app.projects.empty_title')}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {t('app.projects.empty_description')}
                        </p>
                        <Button asChild className="mt-2">
                            <Link href={projectsCreate().url}>
                                <Plus className="size-4" />
                                {t('app.projects.create')}
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className={cn(
                            view === 'grid'
                                ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                                : 'flex flex-col gap-2',
                        )}>
                            {projects.data.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    view={view}
                                />
                            ))}
                        </div>

                        {projects.last_page > 1 ? (
                            <div className="flex flex-wrap gap-1">
                                {projects.links.map((link) => (
                                    <Button
                                        key={link.label}
                                        variant={
                                            link.active ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        disabled={link.url === null}
                                        onClick={() => {
                                            if (link.url) {
                                                router.visit(link.url);
                                            }
                                        }}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </>
    );
}

ProjectsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Projects',
            href: projectsIndex(),
        },
    ],
};
