import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';

// ── Shared colour maps ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    passed: 'text-green-600', failed: 'text-red-600', blocked: 'text-orange-500',
    retest: 'text-yellow-600', skipped: 'text-gray-500', untested: 'text-slate-400',
};
const PRIORITY_COLORS: Record<string, string> = {
    critical: 'text-red-600', high: 'text-orange-500', medium: 'text-yellow-600', low: 'text-sky-600',
};

const STATUS_KEYS   = ['passed', 'failed', 'blocked', 'retest', 'skipped', 'untested'] as const;
const PRIORITY_KEYS = ['critical', 'high', 'medium', 'low'] as const;

// ── Per-type table renderers ──────────────────────────────────────────────────

function ActivityTable({ rows }: { rows: [string, any][] }) {
    const t = useTrans();
    return (
        <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left">{t('app.navigation.projects')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.activity.new_cases')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.activity.updated_cases')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.activity.new_results')}</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(([name, data]) => (
                    <tr key={name} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium">{name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{data?.totals?.new_cases ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{data?.totals?.updated_cases ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{data?.totals?.new_results ?? 0}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function CoverageTable({ rows }: { rows: [string, any][] }) {
    const t = useTrans();
    return (
        <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left">{t('app.navigation.projects')}</th>
                    {STATUS_KEYS.map((k) => (
                        <th key={k} className={`px-3 py-2 text-right capitalize ${STATUS_COLORS[k]}`}>
                            {t(`app.runs.statuses.${k}`)}
                        </th>
                    ))}
                    <th className="px-3 py-2 text-right">{t('app.reports.dashboard.coverage_pct')}</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(([name, data]) => (
                    <tr key={name} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium">{name}</td>
                        {STATUS_KEYS.map((k) => (
                            <td key={k} className="px-3 py-2 text-right tabular-nums">{data?.[k] ?? 0}</td>
                        ))}
                        <td className="px-3 py-2 text-right tabular-nums">{data?.coverage?.pct ?? 0}%</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function DistributionTable({ rows }: { rows: [string, any][] }) {
    const t = useTrans();
    return (
        <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left">{t('app.navigation.projects')}</th>
                    {PRIORITY_KEYS.map((k) => (
                        <th key={k} className={`px-3 py-2 text-right ${PRIORITY_COLORS[k]}`}>
                            {t(`app.test_cases.priorities.${k}`)}
                        </th>
                    ))}
                    <th className="px-3 py-2 text-right">{t('app.reports.distribution.total')}</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(([name, data]) => (
                    <tr key={name} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium">{name}</td>
                        {PRIORITY_KEYS.map((k) => (
                            <td key={k} className="px-3 py-2 text-right tabular-nums">{data?.byPriority?.[k] ?? 0}</td>
                        ))}
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{data?.byPriority?.total ?? 0}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function MilestoneTable({ rows }: { rows: [string, any][] }) {
    const t = useTrans();
    return (
        <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left">{t('app.navigation.projects')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.milestone.total')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.milestone.completed')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.milestone.active')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.dashboard.pct_done')}</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(([name, data]) => (
                    <tr key={name} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium">{name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{data?.totals?.total ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{data?.totals?.completed ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{data?.totals?.active ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{data?.totals?.pct_done ?? 0}%</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function WorkloadTable({ rows }: { rows: [string, any][] }) {
    const t = useTrans();
    return (
        <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left">{t('app.navigation.projects')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.workload.members')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.dashboard.assigned_cases')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.dashboard.results_logged')}</th>
                    <th className="px-3 py-2 text-right">{t('app.reports.workload.avg_pass_rate')}</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(([name, data]) => {
                    const members: any[] = data?.members ?? [];
                    const avgPassRate = members.length > 0
                        ? Math.round(members.reduce((s: number, m: any) => s + (m.pass_rate ?? 0), 0) / members.length)
                        : 0;
                    return (
                        <tr key={name} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 font-medium">{name}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{members.length}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                                {members.reduce((s: number, m: any) => s + (m.assigned_cases ?? 0), 0)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                                {members.reduce((s: number, m: any) => s + (m.results_logged ?? 0), 0)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{avgPassRate}%</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CrossProjectReport({
    results,
    type,
    projects,
}: {
    results: Record<string, any>;
    type: string;
    projects: { id: number; name: string }[];
}) {
    const t = useTrans();
    const rows = Object.entries(results) as [string, any][];

    function renderTable() {
        switch (type) {
            case 'activity_summary':   return <ActivityTable rows={rows} />;
            case 'result_coverage':    return <CoverageTable rows={rows} />;
            case 'case_distribution':  return <DistributionTable rows={rows} />;
            case 'milestone_progress': return <MilestoneTable rows={rows} />;
            case 'workload':           return <WorkloadTable rows={rows} />;
            default: return <p className="text-sm text-muted-foreground">{t('app.reports.coming_soon')}</p>;
        }
    }

    const typeLabel = type
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    return (
        <>
            <Head title={t('app.reports.cross.title')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">
                        {t('app.reports.cross.title')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {typeLabel} · {projects.map((p) => p.name).join(', ')}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{typeLabel}</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        {rows.length === 0
                            ? <p className="py-6 text-center text-sm text-muted-foreground">{t('app.projects.empty_title')}</p>
                            : renderTable()
                        }
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

CrossProjectReport.layout = {
    breadcrumbs: [
        { title: 'Reports', href: '/reports' },
        { title: 'Cross-Project' },
    ],
};
