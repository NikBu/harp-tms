import { Head, Link, usePage } from '@inertiajs/react';
import {
    ClipboardList,
    Flag,
    FolderKanban,
    PlayCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { dashboard } from '@/routes';

const STATUS_COLORS: Record<string, string> = {
    passed: 'bg-green-500',
    failed: 'bg-red-500',
    blocked: 'bg-orange-400',
    retest: 'bg-yellow-400',
    skipped: 'bg-gray-400',
    untested: 'bg-slate-200',
};

interface DashboardStats {
    projects: number;
    test_cases: number;
    active_runs: number;
    milestones: number;
}

interface RecentRun {
    id: number;
    name: string;
    is_completed: boolean;
    created_at: string;
    project: { id: number; name: string } | null;
    passed_count: number;
    failed_count: number;
    blocked_count: number;
    retest_count: number;
    skipped_count: number;
    untested_count: number;
}

interface MyProject {
    id: number;
    name: string;
    is_completed: boolean;
    test_cases_count: number;
    test_runs_count: number;
}

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

function RunBar({ run }: { run: RecentRun }) {
    const segments = [
        { key: 'passed', count: run.passed_count },
        { key: 'failed', count: run.failed_count },
        { key: 'blocked', count: run.blocked_count },
        { key: 'retest', count: run.retest_count },
        { key: 'skipped', count: run.skipped_count },
        { key: 'untested', count: run.untested_count },
    ].filter((s) => s.count > 0);

    const total = segments.reduce((sum, s) => sum + s.count, 0);

    if (total === 0) {
        return <div className="h-1.5 w-full rounded-full bg-muted" />;
    }

    return (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full">
            {segments.map((s) => (
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

export default function Dashboard({
    stats,
    recentRuns,
    myProjects,
}: {
    stats: DashboardStats;
    recentRuns: RecentRun[];
    myProjects: MyProject[];
}) {
    const t = useTrans();
    const { auth } = usePage<{ auth: { user: { name: string } | null } }>().props;
    const name = auth?.user?.name ?? '';

    const cards: { icon: LucideIcon; label: string; value: number; href: string }[] = [
        { icon: FolderKanban, label: t('dashboard.stats.projects'), value: stats.projects, href: '/projects' },
        { icon: ClipboardList, label: t('dashboard.stats.test_cases'), value: stats.test_cases, href: '/projects' },
        { icon: PlayCircle, label: t('dashboard.stats.active_runs'), value: stats.active_runs, href: '/projects' },
        { icon: Flag, label: t('dashboard.stats.milestones'), value: stats.milestones, href: '/projects' },
    ];

    return (
        <>
            <Head title={t('dashboard.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('dashboard.welcome', { name })}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map((card) => (
                        <StatCard
                            key={card.label}
                            icon={card.icon}
                            label={card.label}
                            value={card.value}
                            href={card.href}
                        />
                    ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                                {t('dashboard.recent_runs')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {recentRuns.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('dashboard.no_runs')}
                                </p>
                            ) : (
                                recentRuns.map((run) => (
                                    <div key={run.id} className="grid gap-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <Link
                                                href={`/runs/${run.id}`}
                                                className="truncate text-sm font-medium hover:underline"
                                            >
                                                {run.name}
                                            </Link>
                                            {run.project && (
                                                <Badge variant="outline" className="shrink-0 text-xs">
                                                    {run.project.name}
                                                </Badge>
                                            )}
                                        </div>
                                        <RunBar run={run} />
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                                {t('dashboard.my_projects')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            {myProjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('dashboard.no_projects')}
                                </p>
                            ) : (
                                myProjects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/projects/${project.id}`}
                                        className="flex items-center justify-between rounded-md border p-3 transition-colors hover:border-primary"
                                    >
                                        <span className="flex items-center gap-2 truncate text-sm font-medium">
                                            {project.name}
                                            {project.is_completed && (
                                                <Badge variant="outline" className="text-xs">
                                                    {t('projects.completed')}
                                                </Badge>
                                            )}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {project.test_cases_count} {t('projects.stats.test_cases').toLowerCase()}
                                            {' · '}
                                            {project.test_runs_count} {t('projects.stats.test_runs').toLowerCase()}
                                        </span>
                                    </Link>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
