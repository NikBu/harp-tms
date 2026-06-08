import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    ClipboardList,
    Flag,
    Layers,
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
import {
    index as projectsIndex,
    show as projectsShow,
} from '@/routes/projects';
import type { Project } from '@/types';
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProjectsShow({
    project,
    canManage,
    recentRuns,
}: {
    project: Project;
    canManage: boolean;
    recentRuns: TestRun[];
}) {
    const t = useTrans();
    const pid = project.id;

    const stats: {
        icon: LucideIcon;
        label: string;
        value: number;
        href: string;
    }[] = [
        {
            icon: ClipboardList,
            label: t('app.projects.stats.test_cases'),
            value: project.test_cases_count ?? 0,
            // suite_mode 1 = single suite → go straight to that suite; modes 2/3 → suites list
            href: project.suite_mode === 1
                ? `/projects/${pid}/suites`
                : `/projects/${pid}/suites`,
        },
        {
            icon: PlayCircle,
            label: t('app.projects.stats.test_runs'),
            value: project.test_runs_count ?? 0,
            href: `/projects/${pid}/runs`,
        },
        {
            icon: BookOpen,
            label: t('app.projects.stats.requirements'),
            value: project.requirements_count ?? 0,
            href: `/projects/${pid}/requirements`,
        },
        {
            icon: Layers,
            label: t('app.projects.stats.suites'),
            value: project.suites_count ?? 0,
            href: `/projects/${pid}/suites`,
        },
        {
            icon: Flag,
            label: t('app.projects.stats.milestones'),
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
                                    {t('app.projects.completed')}
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
                                {t('app.settings.title')}
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Announcement */}
                {project.show_announcement && project.announcement && (
                    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('app.projects.announcement')}
                            </CardTitle>
                            <CardDescription className="text-foreground">
                                {project.announcement}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                {/* Stat cards — each links to its section */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

                <div className="grid gap-4 lg:grid-cols-2">

                    {/* Recent active runs */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">
                                {t('app.projects.recent_runs')}
                            </CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/projects/${pid}/runs`}>
                                    {t('app.common.view_all')}
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {recentRuns.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('app.projects.no_active_runs')}
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

                    {/* Members */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">
                                {t('app.projects.members')}
                            </CardTitle>
                            {canManage && (
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/projects/${pid}/settings?tab=members`}>
                                        {t('app.common.manage')}
                                    </Link>
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="grid gap-2">
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
            </div>
        </>
    );
}

ProjectsShow.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
    ],
};