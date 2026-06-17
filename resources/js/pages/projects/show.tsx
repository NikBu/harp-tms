import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    ClipboardList,
    Flag,
    PlayCircle,
    Settings2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import type {
    CasesByPriority,
    LatestRunStats,
    MilestoneStat,
    Project,
} from '@/types';
import type { TestRun } from '@/types/test-run';

// ── Status bar (reused from runs/index) ──────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    passed:   'bg-green-500',
    failed:   'bg-red-500',
    blocked:  'bg-orange-400',
    retest:   'bg-yellow-400',
    skipped:  'bg-gray-400',
    untested: 'bg-slate-200',
};

function MiniProgressBar({ run }: { run: TestRun }) {
    const total =
        run.passed_count + run.failed_count + run.blocked_count +
        run.untested_count + run.retest_count + run.skipped_count;

    if (total === 0) return <div className="h-1.5 w-full rounded-full bg-muted" />;

    const segments = [
        { key: 'passed',   count: run.passed_count },
        { key: 'failed',   count: run.failed_count },
        { key: 'blocked',  count: run.blocked_count },
        { key: 'retest',   count: run.retest_count },
        { key: 'skipped',  count: run.skipped_count },
        { key: 'untested', count: run.untested_count },
    ].filter(s => s.count > 0);

    return (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full">
            {segments.map(s => (
                <div
                    key={s.key}
                    className={STATUS_COLORS[s.key]}
                    style={{ width: `${(s.count / total) * 100}%` }}
                    title={`${s.key}: ${s.count}`}
                />
            ))}
        </div>
    );
}

// ── Stat card (now a link) ────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    href,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    href: string;
}) {
    return (
        <Link href={href} className="block">
            <Card className="transition-colors hover:border-primary">
                <CardContent className="flex items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="size-5 text-muted-foreground" />
                    </div>
                    <div className="grid">
                        <span className="text-2xl font-semibold">{value}</span>
                        <span className="text-sm text-muted-foreground">{label}</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

// ── Pass/Fail donut (pure CSS conic-gradient) ────────────────────────────────

function PassFailDonut({ stats }: { stats: LatestRunStats }) {
    const t = useTrans();

    if (stats === null) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                {t('dashboard.no_runs')}
            </p>
        );
    }

    const total =
        stats.passed + stats.failed + stats.blocked +
        stats.retest + stats.skipped + stats.untested;

    if (total === 0) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                {t('runs.no_tests')}
            </p>
        );
    }

    const segments = [
        { key: 'passed',   color: '#22c55e', count: stats.passed },
        { key: 'failed',   color: '#ef4444', count: stats.failed },
        { key: 'blocked',  color: '#fb923c', count: stats.blocked },
        { key: 'retest',   color: '#facc15', count: stats.retest },
        { key: 'skipped',  color: '#9ca3af', count: stats.skipped },
        { key: 'untested', color: '#e2e8f0', count: stats.untested },
    ].filter(s => s.count > 0);

    let acc = 0;
    const stops = segments
        .map((s) => {
            const start = (acc / total) * 100;
            acc += s.count;
            const end = (acc / total) * 100;
            return `${s.color} ${start}% ${end}%`;
        })
        .join(', ');

    const passPct = Math.round((stats.passed / total) * 100);

    return (
        <div className="flex items-center gap-6">
            <div
                className="relative size-32 shrink-0 rounded-full"
                style={{ background: `conic-gradient(${stops})` }}
            >
                <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-background">
                    <span className="text-xl font-semibold">{passPct}%</span>
                    <span className="text-xs text-muted-foreground">
                        {t('runs.statuses.passed')}
                    </span>
                </div>
            </div>
            <div className="grid gap-1.5 text-sm">
                {segments.map((s) => (
                    <div key={s.key} className="flex items-center gap-2">
                        <span
                            className="size-3 shrink-0 rounded-sm"
                            style={{ backgroundColor: s.color }}
                        />
                        <span className="capitalize text-muted-foreground">
                            {t(`runs.statuses.${s.key}`)}
                        </span>
                        <span className="ml-auto font-medium tabular-nums">{s.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Cases by priority (horizontal bars) ──────────────────────────────────────

const PRIORITY_BAR: { key: keyof CasesByPriority; color: string }[] = [
    { key: 'critical', color: 'bg-red-500' },
    { key: 'high',     color: 'bg-orange-400' },
    { key: 'medium',   color: 'bg-yellow-400' },
    { key: 'low',      color: 'bg-sky-400' },
];

function CasesByPriorityChart({ data }: { data: CasesByPriority }) {
    const t = useTrans();
    const max = Math.max(data.critical, data.high, data.medium, data.low, 1);

    return (
        <div className="grid gap-2.5">
            {PRIORITY_BAR.map(({ key, color }) => (
                <div key={key} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                        {t(`requirements.priorities.${key}`)}
                    </span>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className={`h-full rounded-full ${color}`}
                            style={{ width: `${(data[key] / max) * 100}%` }}
                        />
                    </div>
                    <span className="text-right font-medium tabular-nums">{data[key]}</span>
                </div>
            ))}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProjectsShow({
    project,
    canManage,
    recentRuns,
    casesByPriority,
    latestRunStats,
    milestoneStats,
}: {
    project: Project;
    canManage: boolean;
    recentRuns: TestRun[];
    casesByPriority: CasesByPriority;
    latestRunStats: LatestRunStats;
    milestoneStats: MilestoneStat[];
}) {
    const t = useTrans();
    const pid = project.id;
    const casesHref = project.cases_href ?? `/projects/${pid}/suites`;

    const stats: {
        icon: LucideIcon;
        label: string;
        value: number;
        href: string;
    }[] = [
        {
            icon: ClipboardList,
            label: t('projects.stats.test_cases'),
            value: project.test_cases_count ?? 0,
            href: casesHref,
        },
        {
            icon: PlayCircle,
            label: t('projects.stats.test_runs'),
            value: project.test_runs_count ?? 0,
            href: `/projects/${pid}/runs`,
        },
        {
            icon: BookOpen,
            label: t('projects.stats.requirements'),
            value: project.requirements_count ?? 0,
            href: `/projects/${pid}/requirements`,
        },
        {
            icon: Flag,
            label: t('projects.stats.milestones'),
            value: project.milestones?.length ?? 0,
            href: `/projects/${pid}/milestones`,
        },
    ];

    return (
        <>
            <Head title={project.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">

                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                    <div className="grid gap-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold">{project.name}</h1>
                            {project.is_completed && (
                                <Badge variant="outline">
                                    {t('projects.completed')}
                                </Badge>
                            )}
                        </div>
                        {project.description && (
                            <p className="text-sm text-muted-foreground">
                                {project.description}
                            </p>
                        )}
                    </div>

                    {canManage && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/projects/${pid}/settings`}>
                                <Settings2 className="size-4" />
                                {t('settings.title')}
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Announcement */}
                {project.show_announcement && project.announcement && (
                    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('projects.announcement')}
                            </CardTitle>
                            <CardDescription className="text-foreground">
                                {project.announcement}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                {/* Stat cards — each links to its section */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <StatCard
                            key={stat.label}
                            icon={stat.icon}
                            label={stat.label}
                            value={stat.value}
                            href={stat.href}
                        />
                    ))}
                </div>

                {/* Charts row */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                                {t('projects.latest_run')}
                            </CardTitle>
                            {latestRunStats && (
                                <CardDescription className="truncate">
                                    {latestRunStats.name}
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            <PassFailDonut stats={latestRunStats} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                                {t('projects.cases_by_priority')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CasesByPriorityChart data={casesByPriority} />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">

                    {/* Recent active runs */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">
                                {t('projects.recent_runs')}
                            </CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/projects/${pid}/runs`}>
                                    {t('common.view_all')}
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {recentRuns.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('projects.no_active_runs')}
                                </p>
                            ) : (
                                recentRuns.map((run) => (
                                    <div key={run.id} className="grid gap-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <Link
                                                href={`/runs/${run.id}`}
                                                className="text-sm font-medium hover:underline truncate"
                                            >
                                                {run.name}
                                            </Link>
                                            {run.milestone && (
                                                <Badge variant="outline" className="shrink-0 text-xs">
                                                    {run.milestone.name}
                                                </Badge>
                                            )}
                                        </div>
                                        <MiniProgressBar run={run} />
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Milestone progress */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">
                                {t('runs.milestones.title')}
                            </CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/projects/${pid}/milestones`}>
                                    {t('common.view_all')}
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {milestoneStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('runs.milestones.empty')}
                                </p>
                            ) : (
                                milestoneStats.map((ms) => (
                                    <div key={ms.id} className="grid gap-1">
                                        <div className="flex items-center justify-between gap-2 text-sm">
                                            <span className="truncate font-medium">{ms.name}</span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {ms.run_count} {t('runs.milestones.runs')}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-primary"
                                                style={{ width: `${ms.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                </div>

                {/* Members */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">
                            {t('projects.members')}
                        </CardTitle>
                        {canManage && (
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/projects/${pid}/settings?tab=members`}>
                                    {t('common.manage')}
                                </Link>
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="grid gap-2 sm:grid-cols-2">
                        {(project.members ?? []).map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between text-sm"
                            >
                                <span>{member.name}</span>
                                <Badge variant="secondary" className="capitalize">
                                    {member.pivot.role.replace('_', ' ')}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ProjectsShow.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
    ],
};
