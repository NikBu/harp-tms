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

const COVERAGE_KEYS = [
    'passed',
    'failed',
    'blocked',
    'retest',
    'skipped',
    'untested',
] as const;

const DISTRIBUTION_KEYS = ['critical', 'high', 'medium', 'low'] as const;

export default function ReportsCrossProject({
    results,
    report,
    type,
}: {
    results: Record<string, ReportData>;
    report: ReportType;
    type: string;
    projects: { id: number; name: string }[];
}) {
    const t = useTrans();

    const isCoverage = type === 'result_coverage';
    const isDistribution = type === 'case_distribution';
    const rows = Object.entries(results);

    return (
        <>
            <Head title={t('app.reports.cross.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">
                        {t('app.reports.cross.title')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t(`app.reports.types.${report.key}.name`)}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            {t('app.reports.summary')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!isCoverage && !isDistribution ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                {t('app.reports.coming_soon')}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs text-muted-foreground">
                                        <tr className="border-b border-border">
                                            <th className="px-3 py-2">
                                                {t('app.navigation.projects')}
                                            </th>
                                            {isCoverage &&
                                                COVERAGE_KEYS.map((k) => (
                                                    <th
                                                        key={k}
                                                        className="px-3 py-2 text-right capitalize"
                                                    >
                                                        {t(
                                                            `app.runs.statuses.${k}`,
                                                        )}
                                                    </th>
                                                ))}
                                            {isDistribution &&
                                                DISTRIBUTION_KEYS.map((k) => (
                                                    <th
                                                        key={k}
                                                        className="px-3 py-2 text-right"
                                                    >
                                                        {t(
                                                            `app.requirements.priorities.${k}`,
                                                        )}
                                                    </th>
                                                ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map(([name, data]) => (
                                            <tr
                                                key={name}
                                                className="border-b border-border last:border-0"
                                            >
                                                <td className="px-3 py-2 font-medium">
                                                    {name}
                                                </td>
                                                {isCoverage &&
                                                    COVERAGE_KEYS.map((k) => (
                                                        <td
                                                            key={k}
                                                            className="px-3 py-2 text-right tabular-nums"
                                                        >
                                                            {data
                                                                ? (
                                                                      data as CoverageData
                                                                  )[k]
                                                                : 0}
                                                        </td>
                                                    ))}
                                                {isDistribution &&
                                                    DISTRIBUTION_KEYS.map((k) => (
                                                        <td
                                                            key={k}
                                                            className="px-3 py-2 text-right tabular-nums"
                                                        >
                                                            {data
                                                                ? (
                                                                      data as DistributionData
                                                                  )[k]
                                                                : 0}
                                                        </td>
                                                    ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/reports">
                            <ArrowLeft className="size-4" />
                            {t('app.reports.back')}
                        </Link>
                    </Button>
                </div>
            </div>
        </>
    );
}

ReportsCrossProject.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
