import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpDown,
    CheckCircle2,
    Circle,
    Layers,
    Plus,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project } from '@/types';
import type { TestRun } from '@/types/test-run';

const STATUS_COLORS: Record<string, string> = {
    passed: 'bg-green-500',
    failed: 'bg-red-500',
    blocked: 'bg-orange-400',
    retest: 'bg-yellow-400',
    skipped: 'bg-gray-400',
    untested: 'bg-slate-200',
};

type SortKey = 'name' | 'suite' | 'status' | 'milestone' | 'created';
type SortDir = 'asc' | 'desc';

function runTotal(run: TestRun): number {
    return (
        run.passed_count +
        run.failed_count +
        run.blocked_count +
        run.untested_count +
        run.retest_count +
        run.skipped_count
    );
}

function ProgressBar({ run }: { run: TestRun }) {
    const total = runTotal(run);

    if (total === 0) {
        return <div className="h-2 w-full rounded-full bg-muted" />;
    }

    const segments = [
        { key: 'passed', count: run.passed_count },
        { key: 'failed', count: run.failed_count },
        { key: 'blocked', count: run.blocked_count },
        { key: 'retest', count: run.retest_count },
        { key: 'skipped', count: run.skipped_count },
        { key: 'untested', count: run.untested_count },
    ].filter((s) => s.count > 0);

    return (
        <div className="flex h-2 w-full overflow-hidden rounded-full">
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

export default function RunsIndex({
    project,
    runs,
}: {
    project: Project;
    runs: { data: TestRun[]; current_page: number; last_page: number };
}) {
    const t = useTrans();

    const [sortKey, setSortKey] = useState<SortKey>('created');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [groupByStatus, setGroupByStatus] = useState(false);

    function toggleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }

    const sorted = useMemo(() => {
        const copy = [...runs.data];

        copy.sort((a, b) => {
            let cmp = 0;

            switch (sortKey) {
                case 'name':
                    cmp = a.name.localeCompare(b.name);
                    break;
                case 'suite':
                    cmp = (a.suite?.name ?? '').localeCompare(
                        b.suite?.name ?? '',
                    );
                    break;
                case 'status':
                    cmp = Number(a.is_completed) - Number(b.is_completed);
                    break;
                case 'milestone':
                    cmp = (a.milestone?.name ?? '').localeCompare(
                        b.milestone?.name ?? '',
                    );
                    break;
                case 'created':
                    cmp = a.created_at.localeCompare(b.created_at);
                    break;
            }

            return sortDir === 'asc' ? cmp : -cmp;
        });

        return copy;
    }, [runs.data, sortKey, sortDir]);

    const groups = useMemo(() => {
        if (!groupByStatus) {
            return [{ label: '', runs: sorted }];
        }

        return [
            {
                label: t('app.runs.group_open'),
                runs: sorted.filter((r) => !r.is_completed),
            },
            {
                label: t('app.runs.group_closed'),
                runs: sorted.filter((r) => r.is_completed),
            },
        ].filter((g) => g.runs.length > 0);
    }, [sorted, groupByStatus, t]);

    function deleteRun(run: TestRun) {
        if (!window.confirm(t('app.runs.delete_confirm'))) {
            return;
        }

        router.delete(`/runs/${run.id}`, { preserveScroll: true });
    }

    function SortHeader({
        label,
        column,
    }: {
        label: string;
        column: SortKey;
    }) {
        return (
            <button
                type="button"
                onClick={() => toggleSort(column)}
                className="flex items-center gap-1 font-medium hover:text-foreground"
            >
                {label}
                <ArrowUpDown
                    className={
                        'size-3 ' +
                        (sortKey === column
                            ? 'opacity-100'
                            : 'opacity-40')
                    }
                />
            </button>
        );
    }

    return (
        <>
            <Head title={t('app.runs.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold">
                        {t('app.runs.title')}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={groupByStatus ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setGroupByStatus((v) => !v)}
                        >
                            <Layers className="size-4" />
                            {t('app.runs.group_by_status')}
                        </Button>
                        <Button asChild>
                            <Link href={`/projects/${project.id}/runs/create`}>
                                <Plus className="size-4" />
                                {t('app.runs.create')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {runs.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            {t('app.runs.empty')}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="overflow-hidden rounded-md border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2">
                                        <SortHeader
                                            label={t('app.runs.fields.name')}
                                            column="name"
                                        />
                                    </th>
                                    <th className="px-3 py-2">
                                        <SortHeader
                                            label={t('app.navigation.suites')}
                                            column="suite"
                                        />
                                    </th>
                                    <th className="px-3 py-2">
                                        <SortHeader
                                            label={t('app.runs.fields.status')}
                                            column="status"
                                        />
                                    </th>
                                    <th className="px-3 py-2 w-48">
                                        {t('app.runs.fields.progress')}
                                    </th>
                                    <th className="px-3 py-2">
                                        <SortHeader
                                            label={t('app.runs.fields.milestone')}
                                            column="milestone"
                                        />
                                    </th>
                                    <th className="px-3 py-2">
                                        <SortHeader
                                            label={t('app.runs.fields.created')}
                                            column="created"
                                        />
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        {t('app.common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((group) => (
                                    <RunGroup
                                        key={group.label || 'all'}
                                        group={group}
                                        t={t}
                                        onDelete={deleteRun}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

function RunGroup({
    group,
    t,
    onDelete,
}: {
    group: { label: string; runs: TestRun[] };
    t: (key: string) => string;
    onDelete: (run: TestRun) => void;
}) {
    return (
        <>
            {group.label && (
                <tr className="bg-muted/30">
                    <td
                        colSpan={7}
                        className="px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                    >
                        {group.label} ({group.runs.length})
                    </td>
                </tr>
            )}
            {group.runs.map((run) => (
                <tr
                    key={run.id}
                    className="border-t border-border hover:bg-muted/30"
                >
                    <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                            {run.is_completed ? (
                                <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                            ) : (
                                <Circle className="size-4 shrink-0 text-muted-foreground" />
                            )}
                            <Link
                                href={`/runs/${run.id}`}
                                className="font-medium hover:underline"
                            >
                                {run.name}
                            </Link>
                        </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                        {run.suite?.name ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                        {run.is_completed ? (
                            <Badge variant="secondary" className="text-xs">
                                {t('app.runs.completed')}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs">
                                {t('app.runs.group_open')}
                            </Badge>
                        )}
                    </td>
                    <td className="px-3 py-2">
                        <ProgressBar run={run} />
                        <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                            <span>{run.passed_count}P</span>
                            <span>{run.failed_count}F</span>
                            <span>{run.blocked_count}B</span>
                            <span>{run.untested_count}U</span>
                        </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                        {run.milestone?.name ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                        {new Date(run.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/runs/${run.id}`}>
                                    {t('app.test_cases.view')}
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(run)}
                            >
                                <Trash2 className="size-4 text-destructive" />
                            </Button>
                        </div>
                    </td>
                </tr>
            ))}
        </>
    );
}

RunsIndex.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Runs', href: '' },
    ],
};
