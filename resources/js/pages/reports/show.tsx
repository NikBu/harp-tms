import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';

// ── Type definitions ───────────────────────────────────────────────────────────

interface ActivityData {
    daily: { date: string; new_cases: number; new_results: number; updated_cases: number }[];
    totals: { new_cases: number; new_results: number; updated_cases: number };
}

interface CoverageData {
    passed: number; failed: number; blocked: number;
    retest: number; skipped: number; untested: number;
    run_count: number;
    coverage: { total: number; run: number; untested: number; pct: number };
    by_priority: Record<string, { passed: number; total: number; pct: number }>;
}

interface DistributionData {
    byPriority: { critical: number; high: number; medium: number; low: number; total: number };
    byType: { type: string; count: number }[];
    bySection: { section: string; count: number }[];
    byTemplate: Record<string, number>;
}

interface MilestoneData {
    milestones: {
        id: number; name: string; due_on: string | null;
        is_completed: boolean; run_count: number; done_count: number; pct_done: number;
    }[];
    totals: { total: number; completed: number; active: number; pct_done: number };
}

interface WorkloadMember {
    user_id: number;
    name: string;
    assigned_cases: number;
    results_logged: number;
    pass_rate: number;
    statuses: Record<string, number>;
}

interface WorkloadData {
    members: WorkloadMember[];
}

type ReportData = ActivityData | CoverageData | DistributionData | MilestoneData | WorkloadData | null;

// ── Colour maps ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    passed: 'bg-green-500', failed: 'bg-red-500', blocked: 'bg-orange-400',
    retest: 'bg-yellow-400', skipped: 'bg-gray-400', untested: 'bg-slate-300',
};
const PRIORITY_COLORS: Record<string, string> = {
    critical: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-sky-400',
};
const STATUS_TEXT_COLORS: Record<string, string> = {
    passed: 'text-green-600', failed: 'text-red-600', blocked: 'text-orange-500',
    retest: 'text-yellow-600', skipped: 'text-gray-500', untested: 'text-slate-400',
};

const STATUS_KEYS = ['passed', 'failed', 'blocked', 'retest', 'skipped', 'untested'] as const;

// ── Sub-renderers ─────────────────────────────────────────────────────────────

function ActivityReport({ data }: { data: ActivityData }) {
    const t = useTrans();
    const peak = Math.max(...data.daily.map((d) => d.new_results + d.new_cases), 1);
    return (
        <div className="grid gap-6">
            <div className="grid grid-cols-3 gap-4">
                {(['new_cases', 'updated_cases', 'new_results'] as const).map((k) => (
                    <div key={k} className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                        <p className="text-2xl font-semibold tabular-nums">{data.totals[k]}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t(`app.reports.activity.${k}`)}</p>
                    </div>
                ))}
            </div>
            <div>
                <p className="mb-2 text-xs text-muted-foreground">{t('app.reports.dashboard.activity_intro')}</p>
                <div className="flex h-32 items-end gap-px overflow-hidden rounded">
                    {data.daily.map((d) => {
                        const h = Math.round(((d.new_results + d.new_cases) / peak) * 100);
                        return (
                            <div
                                key={d.date}
                                className="flex-1 bg-primary/70 transition-all hover:bg-primary"
                                style={{ height: `${h}%`, minHeight: h > 0 ? '2px' : '0' }}
                                title={`${d.date}: ${d.new_cases} cases, ${d.new_results} results`}
                            />
                        );
                    })}
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>{data.daily[0]?.date ?? ''}</span>
                    <span>{data.daily[data.daily.length - 1]?.date ?? ''}</span>
                </div>
            </div>
        </div>
    );
}

function CoverageReport({ data }: { data: CoverageData }) {
    const t = useTrans();
    const keys = STATUS_KEYS;
    const total = keys.reduce((s, k) => s + data[k], 0);
    const priorities = ['critical', 'high', 'medium', 'low'] as const;
    return (
        <div className="grid gap-6">
            <p className="text-sm text-muted-foreground">
                {data.run_count} {t('app.reports.runs_analyzed')}
            </p>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {total > 0 && keys.filter((k) => data[k] > 0).map((k) => (
                    <div key={k} className={STATUS_COLORS[k]} style={{ width: `${(data[k] / total) * 100}%` }} title={`${k}: ${data[k]}`} />
                ))}
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
                {keys.map((k) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                        <span className={`size-3 rounded-sm ${STATUS_COLORS[k]}`} />
                        <span className="capitalize text-muted-foreground">{t(`app.runs.statuses.${k}`)}</span>
                        <span className="ml-auto font-medium tabular-nums">{data[k]}</span>
                    </div>
                ))}
            </div>
            <div className="grid gap-2 rounded-lg border border-border p-4">
                <p className="text-sm font-medium">{t('app.reports.coverage.by_priority')}</p>
                {priorities.map((p) => (
                    <div key={p} className="grid grid-cols-[4rem_1fr_3rem] items-center gap-2 text-sm">
                        <span className="text-muted-foreground capitalize">{t(`app.test_cases.priorities.${p}`)}</span>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className={`h-full ${PRIORITY_COLORS[p]}`} style={{ width: `${data.by_priority[p]?.pct ?? 0}%` }} />
                        </div>
                        <span className="text-right tabular-nums text-muted-foreground">{data.by_priority[p]?.pct ?? 0}%</span>
                    </div>
                ))}
            </div>
            <div className="grid gap-1 rounded-lg border border-border p-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                        <p className="text-xl font-semibold tabular-nums">{data.coverage.total}</p>
                        <p className="text-xs text-muted-foreground">{t('app.reports.dashboard.total_cases')}</p>
                    </div>
                    <div>
                        <p className="text-xl font-semibold tabular-nums">{data.coverage.run}</p>
                        <p className="text-xs text-muted-foreground">{t('app.reports.dashboard.cases_run')}</p>
                    </div>
                    <div>
                        <p className="text-xl font-semibold tabular-nums">{data.coverage.untested}</p>
                        <p className="text-xs text-muted-foreground">{t('app.reports.dashboard.cases_untested')}</p>
                    </div>
                    <div>
                        <p className="text-xl font-semibold tabular-nums">{data.coverage.pct}%</p>
                        <p className="text-xs text-muted-foreground">{t('app.reports.dashboard.coverage_pct')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DistributionReport({ data }: { data: DistributionData }) {
    const t = useTrans();
    const priorities = ['critical', 'high', 'medium', 'low'] as const;
    const total = data.byPriority.total || 1;
    return (
        <div className="grid gap-6">
            <div>
                <p className="mb-3 text-sm font-medium">{t('app.reports.distribution.by_priority')}</p>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    {priorities.filter((p) => data.byPriority[p] > 0).map((p) => (
                        <div key={p} className={PRIORITY_COLORS[p]} style={{ width: `${(data.byPriority[p] / total) * 100}%` }} title={`${p}: ${data.byPriority[p]}`} />
                    ))}
                </div>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {priorities.map((p) => (
                        <div key={p} className="flex items-center gap-2 text-sm">
                            <span className={`size-3 rounded-sm ${PRIORITY_COLORS[p]}`} />
                            <span className="capitalize text-muted-foreground">{t(`app.test_cases.priorities.${p}`)}</span>
                            <span className="ml-auto font-medium tabular-nums">{data.byPriority[p]}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="size-3 rounded-sm bg-muted" />
                        <span className="text-muted-foreground">{t('app.reports.distribution.total')}</span>
                        <span className="ml-auto tabular-nums">{data.byPriority.total}</span>
                    </div>
                </div>
            </div>
            {data.byTemplate && Object.keys(data.byTemplate).length > 0 && (
                <div>
                    <p className="mb-3 text-sm font-medium">{t('app.reports.distribution.by_template')}</p>
                    <div className="grid gap-1.5">
                        {Object.entries(data.byTemplate)
                            .filter(([, v]) => v > 0)
                            .sort((a, b) => b[1] - a[1])
                            .map(([k, v]) => (
                                <div key={k} className="flex items-center gap-2 text-sm">
                                    <span className="w-24 capitalize text-muted-foreground">{t(`app.test_cases.templates.${k}`)}</span>
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                        <div className="h-full bg-primary/70" style={{ width: `${(v / total) * 100}%` }} />
                                    </div>
                                    <span className="w-8 text-right tabular-nums">{v}</span>
                                </div>
                            ))}
                    </div>
                </div>
            )}
            {data.bySection && data.bySection.length > 0 && (
                <div>
                    <p className="mb-3 text-sm font-medium">{t('app.reports.distribution.by_section')}</p>
                    <div className="grid gap-1.5">
                        {data.bySection.slice(0, 15).map(({ section, count }) => (
                            <div key={section} className="flex items-center gap-2 text-sm">
                                <span className="min-w-0 flex-1 truncate text-muted-foreground">{section}</span>
                                <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                                    <div className="h-full bg-primary/50" style={{ width: `${(count / total) * 100}%` }} />
                                </div>
                                <span className="w-8 text-right tabular-nums">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {data.byType && data.byType.length > 0 && (
                <div>
                    <p className="mb-3 text-sm font-medium">{t('app.reports.distribution.by_type')}</p>
                    <div className="grid gap-1.5">
                        {data.byType.map(({ type, count }) => (
                            <div key={type} className="flex items-center gap-2 text-sm">
                                <span className="min-w-0 flex-1 truncate text-muted-foreground">{type}</span>
                                <span className="tabular-nums">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MilestoneReport({ data }: { data: MilestoneData }) {
    const t = useTrans();
    return (
        <div className="grid gap-6">
            <div className="grid grid-cols-4 gap-4 text-center">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-2xl font-semibold tabular-nums">{data.totals.total}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('app.reports.milestone.total')}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-2xl font-semibold tabular-nums">{data.totals.completed}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('app.reports.milestone.completed')}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-2xl font-semibold tabular-nums">{data.totals.active}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('app.reports.milestone.active')}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-2xl font-semibold tabular-nums">{data.totals.pct_done}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('app.reports.dashboard.pct_done')}</p>
                </div>
            </div>
            {data.milestones.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground">
                            <tr className="border-b border-border">
                                <th className="px-3 py-2 text-left">{t('app.reports.dashboard.milestone_name')}</th>
                                <th className="px-3 py-2 text-right">{t('app.reports.dashboard.runs_count')}</th>
                                <th className="px-3 py-2 text-right">{t('app.reports.dashboard.pct_done')}</th>
                                <th className="px-3 py-2 text-right">{t('app.reports.dashboard.due_date')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.milestones.map((m) => (
                                <tr key={m.id} className="border-b border-border last:border-0">
                                    <td className="px-3 py-2 font-medium">
                                        {m.name}
                                        {m.is_completed && (
                                            <span className="ml-2 rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                                                {t('app.runs.milestones.completed')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.run_count}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                                <div className="h-full bg-primary" style={{ width: `${m.pct_done}%` }} />
                                            </div>
                                            <span>{m.pct_done}%</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right text-muted-foreground">
                                        {m.due_on ?? t('app.reports.dashboard.no_due')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function WorkloadReport({ data }: { data: WorkloadData }) {
    const t = useTrans();
    if (data.members.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                {t('app.reports.dashboard.no_workload')}
            </p>
        );
    }
    return (
        <div className="grid gap-6">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                        <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left">{t('app.reports.dashboard.member')}</th>
                            <th className="px-3 py-2 text-right">{t('app.reports.dashboard.assigned_cases')}</th>
                            <th className="px-3 py-2 text-right">{t('app.reports.dashboard.results_logged')}</th>
                            <th className="px-3 py-2 text-right">{t('app.reports.workload.pass_rate')}</th>
                            <th className="px-3 py-2 text-left">{t('app.reports.workload.status_breakdown')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.members.map((m) => {
                            const total = Object.values(m.statuses).reduce((s, v) => s + v, 0);
                            return (
                                <tr key={m.user_id} className="border-b border-border last:border-0">
                                    <td className="px-3 py-2 font-medium">{m.name}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.assigned_cases}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.results_logged}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.pass_rate}%</td>
                                    <td className="px-3 py-2">
                                        {total > 0 ? (
                                            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                                                {STATUS_KEYS.filter((k) => (m.statuses[k] ?? 0) > 0).map((k) => (
                                                    <div
                                                        key={k}
                                                        className={STATUS_COLORS[k]}
                                                        style={{ width: `${((m.statuses[k] ?? 0) / total) * 100}%` }}
                                                        title={`${k}: ${m.statuses[k]}`}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {data.members.map((m) => (
                    <div key={m.user_id} className="rounded-lg border border-border p-3">
                        <p className="truncate font-medium">{m.name}</p>
                        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs">
                            <div>
                                <p className="tabular-nums font-semibold">{m.assigned_cases}</p>
                                <p className="text-muted-foreground">{t('app.reports.workload.assigned')}</p>
                            </div>
                            <div>
                                <p className="tabular-nums font-semibold">{m.results_logged}</p>
                                <p className="text-muted-foreground">{t('app.reports.workload.logged')}</p>
                            </div>
                            <div>
                                <p className={`tabular-nums font-semibold ${
                                    m.pass_rate >= 80 ? 'text-green-600' : m.pass_rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`}>{m.pass_rate}%</p>
                                <p className="text-muted-foreground">{t('app.reports.workload.pass_rate')}</p>
                            </div>
                        </div>
                        {Object.values(m.statuses).some((v) => v > 0) && (
                            <div className="mt-2 flex gap-1">
                                {STATUS_KEYS.filter((k) => (m.statuses[k] ?? 0) > 0).map((k) => (
                                    <span key={k} className={`text-xs ${STATUS_TEXT_COLORS[k]}`} title={k}>
                                        {m.statuses[k]}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsShow({
    project,
    type,
    data,
}: {
    project: { id: number; name: string };
    type: string;
    data: ReportData;
}) {
    const t = useTrans();

    function renderReport() {
        if (!data) {
            return (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    {t('app.reports.coming_soon')}
                </p>
            );
        }
        switch (type) {
            case 'activity_summary':  return <ActivityReport data={data as ActivityData} />;
            case 'result_coverage':   return <CoverageReport data={data as CoverageData} />;
            case 'case_distribution': return <DistributionReport data={data as DistributionData} />;
            case 'milestone_progress':return <MilestoneReport data={data as MilestoneData} />;
            case 'workload':          return <WorkloadReport data={data as WorkloadData} />;
            default:
                return (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {t('app.reports.coming_soon')}
                    </p>
                );
        }
    }

    return (
        <>
            <Head title={t(`app.reports.types.${type}.name`)} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">
                        {t(`app.reports.types.${type}.name`)}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {project.name} · {t(`app.reports.types.${type}.desc`)}
                    </p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('app.reports.summary')}</CardTitle>
                    </CardHeader>
                    <CardContent>{renderReport()}</CardContent>
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
