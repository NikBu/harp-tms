import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, Pencil, Trash2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Milestone, MilestoneStatus, MilestoneTestRun } from '@/types/milestone';

const STATUS_BADGE: Record<MilestoneStatus, string> = {
    upcoming:  'bg-slate-100 text-slate-600 border-slate-200',
    active:    'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
};

function RunProgressBar({ run }: { run: MilestoneTestRun }) {
    const total = run.passed_count + run.failed_count + run.blocked_count +
                  run.untested_count + run.retest_count + run.skipped_count;
    if (total === 0) return <div className="h-1.5 w-24 rounded-full bg-muted" />;

    const pct = (n: number) => `${(n / total) * 100}%`;

    return (
        <div className="flex h-1.5 w-24 overflow-hidden rounded-full">
            {run.passed_count  > 0 && <div className="bg-green-500"  style={{ width: pct(run.passed_count) }} />}
            {run.failed_count  > 0 && <div className="bg-red-500"    style={{ width: pct(run.failed_count) }} />}
            {run.blocked_count > 0 && <div className="bg-orange-400" style={{ width: pct(run.blocked_count) }} />}
            {run.retest_count  > 0 && <div className="bg-yellow-400" style={{ width: pct(run.retest_count) }} />}
            {run.skipped_count > 0 && <div className="bg-gray-400"   style={{ width: pct(run.skipped_count) }} />}
            {run.untested_count > 0 && <div className="bg-slate-200" style={{ width: pct(run.untested_count) }} />}
        </div>
    );
}

export default function MilestoneShow({
    milestone,
}: {
    milestone: Milestone;
}) {
    const t = useTrans();

    function toggleComplete() {
        if (milestone.is_completed) {
            router.patch(`/milestones/${milestone.id}/reopen`);
        } else {
            router.patch(`/milestones/${milestone.id}/complete`);
        }
    }

    function deleteMilestone() {
        if (!window.confirm(t('common.confirm_delete'))) return;
        router.delete(`/milestones/${milestone.id}`);
    }

    return (
        <>
            <Head title={milestone.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="grid gap-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold">{milestone.name}</h1>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[milestone.status as MilestoneStatus]}`}>
                                {milestone.status}
                            </span>
                        </div>
                        {milestone.parent && (
                            <p className="text-sm text-muted-foreground">
                                {t('milestones.sub_of')}{' '}
                                <Link href={`/milestones/${milestone.parent.id}`} className="hover:underline">
                                    {milestone.parent.name}
                                </Link>
                            </p>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={`/milestones/${milestone.id}/edit`}>
                                <Pencil className="size-4" />
                                {t('common.edit')}
                            </Link>
                        </Button>
                        <Button variant="outline" onClick={toggleComplete}>
                            {milestone.is_completed
                                ? <><XCircle className="size-4" /> {t('milestones.reopen')}</>
                                : <><CheckCircle2 className="size-4" /> {t('milestones.complete')}</>
                            }
                        </Button>
                        <Button variant="destructive" onClick={deleteMilestone}>
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                    {milestone.start_on && (
                        <span>{t('milestones.fields.start_on')}: <strong className="text-foreground">{milestone.start_on}</strong></span>
                    )}
                    {milestone.due_on && (
                        <span>{t('milestones.fields.due_on')}: <strong className="text-foreground">{milestone.due_on}</strong></span>
                    )}
                    {milestone.refs && (
                        <span>{t('milestones.fields.refs')}: <strong className="text-foreground">{milestone.refs}</strong></span>
                    )}
                </div>

                {milestone.description && (
                    <p className="text-sm">{milestone.description}</p>
                )}

                {/* Sub-milestones */}
                {milestone.children && milestone.children.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('milestones.sub_milestones')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            {milestone.children.map((child) => (
                                <div key={child.id} className="flex items-center justify-between gap-2 rounded border px-3 py-2">
                                    <Link href={`/milestones/${child.id}`} className="text-sm font-medium hover:underline">
                                        {child.name}
                                    </Link>
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[child.status as MilestoneStatus]}`}>
                                        {child.status}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Associated runs */}
                {milestone.test_runs && milestone.test_runs.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('navigation.runs')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            {milestone.test_runs.map((run) => (
                                <div key={run.id} className="flex items-center justify-between gap-3 rounded border px-3 py-2">
                                    <Link href={`/runs/${run.id}`} className="text-sm font-medium hover:underline">
                                        {run.name}
                                    </Link>
                                    <div className="flex items-center gap-3">
                                        <RunProgressBar run={run} />
                                        {run.is_completed && (
                                            <Badge variant="secondary" className="text-xs">
                                                {t('runs.completed')}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

MilestoneShow.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Milestones', href: '' },
    ],
};