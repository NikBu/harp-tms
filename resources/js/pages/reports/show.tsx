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

interface WorkloadData {
    members: {
        user_id: number; name: string; assigned_cases: number;
        results_logged: number; pass_rate: number;
        statuses: Record<string, number>;
    }[];
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
    const keys = ['passed', 'failed', 'blocked', 'retest', 'skipped', 'untested'] as const;
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
                <p className="text-sm font-medium">{t('app.reports.dashboard.coverage')}</p>
                <div className="mt-2 grid grid-cols-3 gap-4 text-center">
                    {(['total', 'run', 'untested'] as const).map((k) => (
                        <div key={k}>
                            <p className="text-lg font-semibold tabular-nums">{data.coverage[k]}</p>
                            <p className="text-xs text-muted-foreground">{t(`app.reports.dashboard.${k === 'total' ? 'total_cases' : k === 'run' ? 'cases_run' : 'cases_untested'}`)}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-2 text-center text-sm text-muted-foreground">{data.coverage.pct}% {t('app.reports.dashboard.coverage_pct').toLowerCase()}</p>
            </div>
        </div>
    );
}

function DistributionReport({ data }: { data: DistributionData }) {
    const t = useTrans();
    const priorityKeys = ['critical', 'high', 'medium', 'low'] as const;
    const templateKeys = ['text', 'steps', 'exploratory', 'bdd', 'checklist'] as const;
    const maxPriority = Math.max(...priorityKeys.map((k) => data.byPriority[k]), 1);
    const maxTemplate = Math.max(...templateKeys.map((k) => data.byTemplate[k] ?? 0), 1);
    return (
        <div className="grid gap-6">
            <div>
                <p className="mb-3 text-sm font-medium">{t('app.reports.distribution.by_priority')}</p>
                <p className="mb-2 text-xs text-muted-foreground">{data.byPriority.total} {t('app.projects.stats.test_cases').toLowerCase()}</p>
                <div className="grid gap-2">
                    {priorityKeys.map((k) => (
                        <div key={k} className="grid grid-cols-[5rem_1fr_2.5rem] items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{t(`app.requirements.priorities.${k}`)}</span>
                            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                                <div className={`h-full rounded-full ${PRIORITY_COLORS[k]}`} style={{ width: `${(data.byPriority[k] / maxPriority) * 100}%` }} />
                            </div>
                            <span className="text-right font-medium tabular-nums">{data.byPriority[k]}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <p className="mb-3 text-sm font-medium">{t('app.reports.distribution.by_template')}</p>
                <div className="grid gap-2">
                    {templateKeys.map((k) => (
                        <div key={k} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{t(`app.test_cases.templates.${k}`)}</span>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary/60" style={{ width: `${((data.byTemplate[k] ?? 0) / maxTemplate) * 100}%` }} />
                            </div>
                            <span className="text-right tabular-nums">{data.byTemplate[k] ?? 0}</span>
                        </div>
                    ))}
                </div>
            </div>
            {data.bySection.length > 0 && (
                <div>
                    <p className="mb-3 text-sm font-medium">{t('app.reports.distribution.by_section')}</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-muted-foreground">
                                <tr className="border-b border-border">
                                    <th className="px-2 py-1.5 text-left">{t('app.sections.title')}</th>
                                    <th className="px-2 py-1.5 text-right">{t('app.test_cases.count').replace(':count', '').trim()}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.bySection.map((s) => (
                                    <tr key={s.section} className="border-b border-border last:border-0">
                                        <td className="px-2 py-1.5">{s.section}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums font-medium">{s.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function MilestoneReport({ data }: { data: MilestoneData }) {
    const t = useTrans();
    return (
        <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
                {(['total', 'active', 'completed'] as const).map((k) => (
                    <div key={k} className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                        <p className="text-2xl font-semibold tabular-nums">{data.totals[k]}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t(`app.reports.milestone.${k}`)}</p>
                    </div>
                ))}
            </div>
            {data.milestones.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('app.milestones.empty')}</p>
            ) : (
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
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            {m.is_completed && (
                                                <span className="inline-block size-2 rounded-full bg-green-500" />
                                            )}
                                            {m.name}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.run_count}</td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                                <div className="h-full bg-primary" style={{ width: `${m.pct_done}%` }} />
                                            </div>
                                            <span className="tabular-nums">{m.pct_done}%</span>
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
    const statusKeys = ['passed', 'failed', 'blocked', 'retest', 'skipped', 'untested'] as const;
    return (
        <div className="grid gap-4">
            {data.members.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('app.reports.dashboard.no_workload')}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground">
                            <tr className="border-b border-border">
                                <th className="px-3 py-2 text-left">{t('app.reports.dashboard.member')}</th>
                                <th className="px-3 py-2 text-right">{t('app.reports.dashboard.assigned_cases')}</th>
                                <th className="px-3 py-2 text-right">{t('app.reports.dashboard.results_logged')}</th>
                                <th className="px-3 py-2 text-right">{t('app.reports.workload.pass_rate')}</th>
                                {statusKeys.map((k) => (
                                    <th key={k} className="px-2 py-2 text-right capitalize text-xs">{t(`app.runs.statuses.${k}`)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.members.map((m) => (
                                <tr key={m.user_id} className="border-b border-border last:border-0">
                                    <td className="px-3 py-2 font-medium">{m.name}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.assigned_cases}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.results_logged}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.pass_rate}%</td>
                                    {statusKeys.map((k) => (
                                        <td key={k} className="px-2 py-2 text-right tabular-nums text-xs">{m.statuses[k] ?? 0}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
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

    function renderContent() {
        if (!data) {
            return (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    {t('app.reports.coming_soon')}
                </p>
            );
        }
        switch (type) {
            case 'activity_summary':
                return <ActivityReport data={data as ActivityData} />;
            case 'result_coverage':
                return <CoverageReport data={data as CoverageData} />;
            case 'case_distribution':
                return <DistributionReport data={data as DistributionData} />;
            case 'milestone_progress':
                return <MilestoneReport data={data as MilestoneData} />;
            case 'workload':
                return <WorkloadReport data={data as WorkloadData} />;
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
                        {t(`app.reports.types.${type}.desc`)}
                    </p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('app.reports.summary')}</CardTitle>
                    </CardHeader>
                    <CardContent>{renderContent()}</CardContent>
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
