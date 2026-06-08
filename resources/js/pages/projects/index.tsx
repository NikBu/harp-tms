import { Head, Link, router } from '@inertiajs/react';
import { FolderOpen, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import {
    create as projectsCreate,
    index as projectsIndex,
    show as projectsShow,
} from '@/routes/projects';
import type { PaginatedProjects, Project, SuiteMode } from '@/types';

function SuiteModeBadge({ mode }: { mode: SuiteMode }) {
    const t = useTrans();
    const labels: Record<SuiteMode, string> = {
        1: t('app.projects.suite_mode_single'),
        2: t('app.projects.suite_mode_single_baseline'),
        3: t('app.projects.suite_mode_multi'),
    };

    return <Badge variant="secondary">{labels[mode]}</Badge>;
}

function ProjectCard({ project }: { project: Project }) {
    const t = useTrans();

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

    return (
        <>
            <Head title={t('app.projects.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">
                        {t('app.projects.title')}
                    </h1>
                    <Button asChild>
                        <Link href={projectsCreate().url}>
                            <Plus className="size-4" />
                            {t('app.projects.create')}
                        </Link>
                    </Button>
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
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {projects.data.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
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
