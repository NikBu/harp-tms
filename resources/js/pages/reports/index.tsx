import { Head, Link } from '@inertiajs/react';
import { BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';

interface ReportType {
    key: string;
    name: string;
    desc: string;
}

export default function ReportsIndex({
    project,
    reportTypes,
}: {
    project: { id: number; name: string };
    reportTypes: ReportType[];
}) {
    const t = useTrans();

    return (
        <>
            <Head title={t('app.reports.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">{t('app.reports.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('app.reports.intro')}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {reportTypes.map((report) => (
                        <Card key={report.key} className="flex flex-col">
                            <CardHeader>
                                <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                                    <BarChart2 className="size-5 text-muted-foreground" />
                                </div>
                                <CardTitle className="text-base">
                                    {t(`app.reports.types.${report.key}.name`)}
                                </CardTitle>
                                <CardDescription>
                                    {t(`app.reports.types.${report.key}.desc`)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/projects/${project.id}/reports/${report.key}`}>
                                        {t('app.reports.view')}
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
