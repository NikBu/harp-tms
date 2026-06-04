import { Head } from '@inertiajs/react';
import {
    BookOpen,
    ClipboardList,
    Flag,
    Layers,
    PlayCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project } from '@/types';

function StatCard({
    icon: Icon,
    label,
    value,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="grid">
                    <span className="text-2xl font-semibold">{value}</span>
                    <span className="text-sm text-muted-foreground">
                        {label}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

export default function ProjectsShow({ project }: { project: Project }) {
    const t = useTrans();

    const stats: { icon: LucideIcon; label: string; value: number }[] = [
        {
            icon: ClipboardList,
            label: t('app.projects.stats.test_cases'),
            value: project.test_cases_count ?? 0,
        },
        {
            icon: PlayCircle,
            label: t('app.projects.stats.test_runs'),
            value: project.test_runs_count ?? 0,
        },
        {
            icon: BookOpen,
            label: t('app.projects.stats.requirements'),
            value: project.requirements_count ?? 0,
        },
        {
            icon: Layers,
            label: t('app.projects.stats.suites'),
            value: project.suites_count ?? 0,
        },
        {
            icon: Flag,
            label: t('app.projects.stats.milestones'),
            value: project.milestones?.length ?? 0,
        },
    ];

    return (
        <>
            <Head title={project.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="grid gap-1">
                        <h1 className="text-2xl font-semibold">
                            {project.name}
                        </h1>
                        {project.description ? (
                            <p className="text-sm text-muted-foreground">
                                {project.description}
                            </p>
                        ) : null}
                    </div>
                    {project.is_completed ? (
                        <Badge variant="outline">
                            {t('app.projects.completed')}
                        </Badge>
                    ) : null}
                </div>

                {project.show_announcement && project.announcement ? (
                    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('app.projects.announcement')}
                            </CardTitle>
                            <CardDescription className="text-foreground">
                                {project.announcement}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {stats.map((stat) => (
                        <StatCard
                            key={stat.label}
                            icon={stat.icon}
                            label={stat.label}
                            value={stat.value}
                        />
                    ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('app.projects.members')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            {(project.members ?? []).map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span>{member.name}</span>
                                    <Badge variant="secondary">
                                        {member.pivot.role}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('app.projects.created_by')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            {project.created_by?.name ?? '—'}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

ProjectsShow.layout = {
    breadcrumbs: [
        {
            title: 'Projects',
            href: projectsIndex(),
        },
    ],
};
