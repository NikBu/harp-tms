import { Head, Link, router } from '@inertiajs/react';
import { BarChart2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ReportDashboard,
    type DashboardData,
} from '@/components/reports/report-dashboard';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';

interface ReportType {
    key: string;
}

type ProjectOption = { id: number; name: string };

export default function ReportsIndex({
    project,
    projects,
    reportTypes,
    isGlobal,
    dashboard,
}: {
    project: { id: number; name: string } | null;
    projects: ProjectOption[] | null;
    reportTypes: ReportType[];
    isGlobal: boolean;
    dashboard: DashboardData;
}) {
    const t = useTrans();

    const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
    const [crossType, setCrossType] = useState<string>(
        reportTypes[0]?.key ?? '',
    );
    const [running, setRunning] = useState(false);

    function toggleProject(id: number) {
        setSelectedProjects((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
        );
    }

    function runCrossReport() {
        if (selectedProjects.length === 0) return;
        setRunning(true);
        router.post(
            '/reports/cross-project',
            { project_ids: selectedProjects, type: crossType },
            { onFinish: () => setRunning(false) },
        );
    }

    const projectCards = project && (
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
    );

    // For cross-project tab, show all projects (global) or all accessible (project context)
    const crossProjects = isGlobal ? (projects ?? []) : (projects ?? []);

    const crossPanel = (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {t('app.reports.cross.title')}
                </CardTitle>
                <CardDescription>
                    {t('app.reports.cross.intro')}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid gap-2">
                    <Label>{t('app.reports.cross.projects')}</Label>
                    <div className="grid max-h-56 gap-1 overflow-y-auto rounded-md border p-2">
                        {crossProjects.length === 0 ? (
                            <p className="px-1 py-2 text-sm text-muted-foreground">
                                {t('app.projects.empty_title')}
                            </p>
                        ) : (
                            crossProjects.map((p) => (
                                <label
                                    key={p.id}
                                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedProjects.includes(p.id)}
                                        onChange={() => toggleProject(p.id)}
                                        className="size-4 accent-primary"
                                    />
                                    {p.name}
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <div className="grid gap-2 sm:max-w-xs">
                    <Label>{t('app.reports.cross.report_type')}</Label>
                    <Select value={crossType} onValueChange={setCrossType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {reportTypes.map((report) => (
                                <SelectItem key={report.key} value={report.key}>
                                    {t(`app.reports.types.${report.key}.name`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Button
                        onClick={runCrossReport}
                        disabled={running || selectedProjects.length === 0}
                    >
                        {t('app.reports.cross.run')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <>
            <Head title={t('app.reports.title')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">
                        {t('app.reports.title')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('app.reports.intro')}
                    </p>
                </div>

                {isGlobal ? (
                    <Tabs defaultValue="dashboard">
                        <TabsList>
                            <TabsTrigger value="dashboard">
                                {t('app.reports.tabs.dashboard')}
                            </TabsTrigger>
                            <TabsTrigger value="cross">
                                {t('app.reports.tabs.cross')}
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="dashboard">
                            <ReportDashboard data={dashboard} />
                        </TabsContent>
                        <TabsContent value="cross">{crossPanel}</TabsContent>
                    </Tabs>
                ) : (
                    <Tabs defaultValue="dashboard">
                        <TabsList>
                            <TabsTrigger value="dashboard">
                                {t('app.reports.tabs.dashboard')}
                            </TabsTrigger>
                            <TabsTrigger value="project">
                                {t('app.reports.tabs.types')}
                            </TabsTrigger>
                            <TabsTrigger value="cross">
                                {t('app.reports.tabs.cross')}
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="dashboard">
                            <ReportDashboard data={dashboard} />
                        </TabsContent>
                        <TabsContent value="project">
                            {projectCards}
                        </TabsContent>
                        <TabsContent value="cross">{crossPanel}</TabsContent>
                    </Tabs>
                )}
            </div>
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
