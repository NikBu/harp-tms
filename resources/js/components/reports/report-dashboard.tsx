import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';

// Status palette shared across the app.
const STATUS_COLORS: Record<string, string> = {
    passed: '#22c55e',
    failed: '#ef4444',
    blocked: '#f97316',
    untested: '#94a3b8',
    in_progress: '#3b82f6',
    retest: '#a855f7',
    skipped: '#64748b',
};

const STATUS_KEYS = [
    'passed',
    'failed',
    'blocked',
    'untested',
    'retest',
    'skipped',
] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

export interface DashboardData {
    statusTotals: Record<StatusKey, number>;
    runs: Array<{
        id: number;
        name: string;
        is_completed: boolean;
        created_at: string | null;
        total: number;
        breakdown: Record<StatusKey, number>;
        pct_passed: number;
    }>;
    activity: Array<{ date: string } & Record<StatusKey, number>>;
    coverage: { total: number; run: number; untested: number; pct: number };
    sectionCoverage: Array<{
        section: string;
        tested: number;
        untested: number;
    }>;
    milestones: Array<{
        id: number;
        name: string;
        due_on: string | null;
        is_completed: boolean;
        run_count: number;
        pct_done: number;
    }>;
    workload: Array<{
        user_id: number;
        name: string;
        assigned_cases: number;
        results_logged: number;
    }>;
    hasMilestones: boolean;
}

function StatBreakdownBar({
    breakdown,
    total,
}: {
    breakdown: Record<StatusKey, number>;
    total: number;
}) {
    if (total === 0) {
        return <div className="h-2.5 w-full rounded-full bg-muted" />;
    }
    return (
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {STATUS_KEYS.filter((k) => breakdown[k] > 0).map((k) => (
                <div
                    key={k}
                    style={{
                        width: `${(breakdown[k] / total) * 100}%`,
                        backgroundColor: STATUS_COLORS[k],
                    }}
                    title={`${k}: ${breakdown[k]}`}
                />
            ))}
        </div>
    );
}

function ProgressBar({ pct }: { pct: number }) {
    return (
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
            />
        </div>
    );
}

function fmtDate(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
}

export function ReportDashboard({ data }: { data: DashboardData }) {
    const t = useTrans();

    const statusLabel = (k: string) => t(`app.runs.statuses.${k}`);

    const pieData = useMemo(
        () =>
            STATUS_KEYS.map((k) => ({
                name: statusLabel(k),
                key: k,
                value: data.statusTotals[k] ?? 0,
            })).filter((d) => d.value > 0),
        [data.statusTotals],
    );

    const hasActivity = useMemo(
        () => data.activity.some((d) => STATUS_KEYS.some((k) => d[k] > 0)),
        [data.activity],
    );

    return (
        <div className="grid gap-6">
            {/* ── Section A: Test Run Summary ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('app.reports.dashboard.run_summary')}
                    </CardTitle>
                    <CardDescription>
                        {t('app.reports.dashboard.status_distribution')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[18rem_1fr]">
                    <div className="h-64">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={55}
                                        outerRadius={90}
                                        paddingAngle={2}
                                    >
                                        {pieData.map((entry) => (
                                            <Cell
                                                key={entry.key}
                                                fill={STATUS_COLORS[entry.key]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                {t('app.reports.dashboard.no_runs')}
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        {data.runs.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                        <th className="px-3 py-2 font-medium">
                                            {t(
                                                'app.reports.dashboard.run_name',
                                            )}
                                        </th>
                                        <th className="w-40 px-3 py-2 font-medium">
                                            {t(
                                                'app.reports.dashboard.breakdown',
                                            )}
                                        </th>
                                        <th className="w-24 px-3 py-2 text-right font-medium">
                                            {t(
                                                'app.reports.dashboard.pct_passed',
                                            )}
                                        </th>
                                        <th className="w-28 px-3 py-2 font-medium">
                                            {t('app.reports.dashboard.created')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.runs.map((run) => (
                                        <tr
                                            key={run.id}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-3 py-2 font-medium">
                                                {run.name}
                                            </td>
                                            <td className="px-3 py-2">
                                                <StatBreakdownBar
                                                    breakdown={run.breakdown}
                                                    total={run.total}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {run.pct_passed}%
                                            </td>
                                            <td className="px-3 py-2 text-xs text-muted-foreground">
                                                {fmtDate(run.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                {t('app.reports.dashboard.no_runs')}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Section B: Activity Over Time ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('app.reports.dashboard.activity')}
                    </CardTitle>
                    <CardDescription>
                        {t('app.reports.dashboard.activity_intro')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-72">
                        {hasActivity ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={data.activity}
                                    margin={{
                                        top: 8,
                                        right: 16,
                                        bottom: 8,
                                        left: -16,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="stroke-border"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(d: string) =>
                                            d.slice(5)
                                        }
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <Tooltip />
                                    <Legend />
                                    {STATUS_KEYS.map((k) => (
                                        <Line
                                            key={k}
                                            type="monotone"
                                            dataKey={k}
                                            name={statusLabel(k)}
                                            stroke={STATUS_COLORS[k]}
                                            dot={false}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                {t('app.reports.dashboard.no_activity')}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Section C: Case Coverage ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('app.reports.dashboard.coverage')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid gap-4 sm:grid-cols-4">
                        <CoverageStat
                            label={t('app.reports.dashboard.total_cases')}
                            value={data.coverage.total}
                        />
                        <CoverageStat
                            label={t('app.reports.dashboard.cases_run')}
                            value={data.coverage.run}
                        />
                        <CoverageStat
                            label={t('app.reports.dashboard.cases_untested')}
                            value={data.coverage.untested}
                        />
                        <CoverageStat
                            label={t('app.reports.dashboard.coverage_pct')}
                            value={`${data.coverage.pct}%`}
                        />
                    </div>

                    {data.sectionCoverage.length > 0 && (
                        <div>
                            <p className="mb-2 text-sm font-medium">
                                {t('app.reports.dashboard.coverage_by_section')}
                            </p>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={data.sectionCoverage}
                                        margin={{
                                            top: 8,
                                            right: 16,
                                            bottom: 8,
                                            left: -16,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            className="stroke-border"
                                        />
                                        <XAxis
                                            dataKey="section"
                                            tick={{ fontSize: 11 }}
                                            interval={0}
                                            angle={-20}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tick={{ fontSize: 11 }}
                                        />
                                        <Tooltip />
                                        <Legend />
                                        <Bar
                                            dataKey="tested"
                                            name={t(
                                                'app.reports.dashboard.tested',
                                            )}
                                            stackId="a"
                                            fill={STATUS_COLORS.passed}
                                        />
                                        <Bar
                                            dataKey="untested"
                                            name={t(
                                                'app.reports.dashboard.untested',
                                            )}
                                            stackId="a"
                                            fill={STATUS_COLORS.untested}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Section D: Milestone Progress ── */}
            {data.hasMilestones && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            {t('app.reports.dashboard.milestones')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                    <th className="px-3 py-2 font-medium">
                                        {t(
                                            'app.reports.dashboard.milestone_name',
                                        )}
                                    </th>
                                    <th className="w-48 px-3 py-2 font-medium">
                                        {t('app.reports.dashboard.pct_done')}
                                    </th>
                                    <th className="w-20 px-3 py-2 text-right font-medium">
                                        {t('app.reports.dashboard.runs_count')}
                                    </th>
                                    <th className="w-28 px-3 py-2 font-medium">
                                        {t('app.reports.dashboard.due_date')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.milestones.map((m) => (
                                    <tr
                                        key={m.id}
                                        className="border-b border-border last:border-0"
                                    >
                                        <td className="px-3 py-2 font-medium">
                                            {m.name}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <ProgressBar pct={m.pct_done} />
                                                <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                                                    {m.pct_done}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {m.run_count}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-muted-foreground">
                                            {m.due_on
                                                ? fmtDate(m.due_on)
                                                : t(
                                                      'app.reports.dashboard.no_due',
                                                  )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* ── Section E: Workload / Assignments ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('app.reports.dashboard.workload')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    {data.workload.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                    <th className="px-3 py-2 font-medium">
                                        {t('app.reports.dashboard.member')}
                                    </th>
                                    <th className="w-40 px-3 py-2 text-right font-medium">
                                        {t(
                                            'app.reports.dashboard.assigned_cases',
                                        )}
                                    </th>
                                    <th className="w-40 px-3 py-2 text-right font-medium">
                                        {t(
                                            'app.reports.dashboard.results_logged',
                                        )}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.workload.map((w) => (
                                    <tr
                                        key={w.user_id}
                                        className="border-b border-border last:border-0"
                                    >
                                        <td className="px-3 py-2 font-medium">
                                            {w.name}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {w.assigned_cases}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {w.results_logged}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            {t('app.reports.dashboard.no_workload')}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function CoverageStat({
    label,
    value,
}: {
    label: string;
    value: number | string;
}) {
    return (
        <div className="rounded-lg border border-border p-4">
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}
