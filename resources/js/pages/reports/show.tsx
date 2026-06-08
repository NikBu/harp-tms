import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';

interface ReportType {
    key: string;
    name: string;
    desc: string;
}

interface CoverageData {
    passed: number;
    failed: number;
    blocked: number;
    retest: number;
    skipped: number;
    untested: number;
    run_count: number;
}

interface DistributionData {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
}

type ReportData = CoverageData | DistributionData | null;

const COVERAGE_COLORS: Record<string, string> = {
    passed: 'bg-green-500',
    failed: 'bg-red-500',
    blocked: 'bg-orange-400',
    retest: 'bg-yellow-400',
    skipped: 'bg-gray-400',
    untested: 'bg-slate-300',
};

const PRIORITY_COLORS: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-400',
    medium: 'bg-yellow-400',
    low: 'bg-sky-400',
};

function CoverageSummary({ data }: { data: CoverageData }) {
    const t = useTrans();
    const keys = ['passed', 'failed', 'blocked', 'retest', 'skipped', 'untested'] as const;
    const total = keys.reduce((sum, k) => sum + data[k], 0);

    return (
        <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
                {data.run_count} {t('app.reports.runs_analyzed')}
            </p>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {total > 0 &&
                    keys
                        .filter((k) => data[k] > 0)
                        .map((k) => (
                            <div
                                key={k}
                                className={COVERAGE_COLORS[k]}
                                style={{ width: `${(data[k] / total) * 100}%` }}
                                title={`${k}: ${data[k]}`}
                            />
                        ))}
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
                {keys.map((k) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                        <span className={`size-3 rounded-sm ${COVERAGE_COLORS[k]}`} />
                        <span className="capitalize text-muted-foreground">
                            {t(`app.runs.statuses.${k}`)}
                        </span>
                        <span className="ml-auto font-medium tabular-nums">{data[k]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DistributionSummary({ data }: { data: DistributionData }) {
    const t = useTrans();
    const keys = ['critical', 'high', 'medium', 'low'] as const;
    const max = Math.max(...keys.map((k) => data[k]), 1);

    return (
        <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
                {data.total} {t('app.projects.stats.test_cases').toLowerCase()}
            </p>
            <div className="grid gap-2.5">
                {keys.map((k) => (
                    <div
                        key={k}
                        className="grid grid-cols-[5rem_1fr_2rem] items-center gap-2 text-sm"
                    >
                        <span className="text-muted-foreground">
                            {t(`app.requirements.priorities.${k}`)}
                        </span>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full ${PRIORITY_COLORS[k]}`}
                                style={{ width: `${(data[k] / max) * 100}%` }}
                            />
                        </div>
                        <span className="text-right font-medium tabular-nums">{data[k]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ReportsShow({
    project,
    report,
    data,
}: {
    project: { id: number; name: string };
    report: ReportType;
    data: ReportData;
}) {
    const t = useTrans();
    const isCoverage = report.key === 'result_coverage';
    const isDistribution = report.key === 'case_distribution';

    return (
        <>
            <Head title={report.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">
                        {t(`app.reports.types.${report.key}.name`)}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t(`app.reports.types.${report.key}.desc`)}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('app.reports.summary')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isCoverage && data ? (
                            <CoverageSummary data={data as CoverageData} />
                        ) : isDistribution && data ? (
                            <DistributionSummary data={data as DistributionData} />
                        ) : (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                {t('app.reports.coming_soon')}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/projects/${project.id}/reports`}>
                            <ArrowLeft className="size-4" />
                            {t('app.reports.back')}
                        </Link>
                    </Button>
                </div>
            </div>
        </>
    );
}

ReportsShow.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
