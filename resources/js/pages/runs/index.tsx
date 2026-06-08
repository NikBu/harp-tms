import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project } from '@/types';
import type { TestRun } from '@/types/test-run';

const STATUS_COLORS: Record<string, string> = {
    passed:   'bg-green-500',
    failed:   'bg-red-500',
    blocked:  'bg-orange-400',
    retest:   'bg-yellow-400',
    skipped:  'bg-gray-400',
    untested: 'bg-slate-200',
};

function ProgressBar({ run }: { run: TestRun }) {
    const total = run.passed_count + run.failed_count + run.blocked_count +
                  run.untested_count + run.retest_count + run.skipped_count;

    if (total === 0) {
        return <div className="h-2 w-full rounded-full bg-muted" />;
    }

    const segments: { key: string; count: number }[] = [
        { key: 'passed',   count: run.passed_count },
        { key: 'failed',   count: run.failed_count },
        { key: 'blocked',  count: run.blocked_count },
        { key: 'retest',   count: run.retest_count },
        { key: 'skipped',  count: run.skipped_count },
        { key: 'untested', count: run.untested_count },
    ].filter(s => s.count > 0);

    return (
        <div className="flex h-2 w-full overflow-hidden rounded-full">
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

export default function RunsIndex({
    project,
    runs,
}: {
    project: Project;
    runs: { data: TestRun[]; current_page: number; last_page: number };
}) {
    const t = useTrans();

    return (
        <>
            <Head title={t('app.runs.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold">{t('app.runs.title')}</h1>
                    <Button asChild>
                        <Link href={`/projects/${project.id}/runs/create`}>
                            <Plus className="size-4" />
                            {t('app.runs.create')}
                        </Link>
                    </Button>
                </div>

                {runs.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            {t('app.runs.empty')}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {runs.data.map((run) => (
                            <Card key={run.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            {run.is_completed
                                                ? <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                                                : <Circle className="size-4 shrink-0 text-muted-foreground" />
                                            }
                                            <CardTitle className="text-base">
                                                <Link
                                                    href={`/runs/${run.id}`}
                                                    className="hover:underline"
                                                >
                                                    {run.name}
                                                </Link>
                                            </CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {run.milestone && (
                                                <Badge variant="outline" className="text-xs">
                                                    {run.milestone.name}
                                                </Badge>
                                            )}
                                            {run.is_completed && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {t('app.runs.completed')}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid gap-2">
                                    <ProgressBar run={run} />
                                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        <span>{run.passed_count} {t('app.runs.statuses.passed')}</span>
                                        <span>{run.failed_count} {t('app.runs.statuses.failed')}</span>
                                        <span>{run.blocked_count} {t('app.runs.statuses.blocked')}</span>
                                        <span>{run.untested_count} {t('app.runs.statuses.untested')}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

RunsIndex.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Runs', href: '' },
    ],
};