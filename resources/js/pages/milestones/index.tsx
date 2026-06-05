import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, Circle, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project } from '@/types';
import type { Milestone, MilestoneStatus } from '@/types/milestone';

const STATUS_BADGE: Record<MilestoneStatus, string> = {
    upcoming:  'bg-slate-100 text-slate-600 border-slate-200',
    active:    'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
};

function MilestoneRow({ milestone }: { milestone: Milestone }) {
    const t = useTrans();

    return (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                {milestone.is_completed
                    ? <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                    : <Circle className="size-4 shrink-0 text-muted-foreground" />
                }
                <div className="min-w-0">
                    <Link
                        href={`/milestones/${milestone.id}`}
                        className="truncate text-sm font-medium hover:underline"
                    >
                        {milestone.name}
                    </Link>
                    {milestone.due_on && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('app.milestones.due')} {milestone.due_on}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {milestone.test_runs_count !== undefined && milestone.test_runs_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                        {milestone.test_runs_count} {t('app.milestones.runs')}
                    </span>
                )}
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[milestone.status as MilestoneStatus]}`}>
                    {milestone.status}
                </span>
                <Button variant="ghost" size="icon" className="size-7" asChild>
                    <Link href={`/milestones/${milestone.id}`}>
                        <ChevronRight className="size-4" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export default function MilestonesIndex({
    project,
    milestones,
}: {
    project: Project;
    milestones: Milestone[];
}) {
    const t = useTrans();

    return (
        <>
            <Head title={t('app.milestones.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold">{t('app.milestones.title')}</h1>
                    <Button asChild>
                        <Link href={`/projects/${project.id}/milestones/create`}>
                            <Plus className="size-4" />
                            {t('app.milestones.create')}
                        </Link>
                    </Button>
                </div>

                {milestones.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            {t('app.milestones.empty')}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-2">
                        {milestones.map((m) => (
                            <div key={m.id} className="grid gap-1">
                                <MilestoneRow milestone={m} />

                                {/* Sub-milestones indented */}
                                {m.children && m.children.length > 0 && (
                                    <div className="ml-8 grid gap-1">
                                        {m.children.map((child) => (
                                            <MilestoneRow key={child.id} milestone={child as unknown as Milestone} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

MilestonesIndex.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Milestones', href: '' },
    ],
};