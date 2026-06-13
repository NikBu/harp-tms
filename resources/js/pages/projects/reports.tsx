import { Head } from '@inertiajs/react';
import { ClipboardList, Flag, PlayCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import type { Project } from '@/types';
import { index as projectsIndex } from '@/routes/projects';

export default function ProjectsReports({ project }: { project: Project }) {
    const t = useTrans();

    const stats: { icon: LucideIcon; label: string; value: number }[] = [
        {
            icon: PlayCircle,
            label: t('app.reports.stats.test_runs'),
            value: project.test_runs_count ?? 0,
        },
        {
            icon: ClipboardList,
            label: t('app.reports.stats.test_cases'),
            value: project.test_cases_count ?? 0,
        },
        {
            icon: Flag,
            label: t('app.reports.stats.milestones'),
            value: project.milestones_count ?? 0,
        },
    ];

    return (
        <>
            <Head title={t('app.reports.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div>
                    <h1 className="text-xl font-semibold">
                        {t('app.reports.title')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('app.reports.description')}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.map(({ icon: Icon, label, value }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {label}
                                </CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold">
                                    {value}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}

ProjectsReports.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
