import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, ExternalLink, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { BulkResultItem, TestInstance, TestRun, TestStatus } from '@/types/test-run';


// ── Status helpers ────────────────────────────────────────────────────────────


const STATUS_BADGE: Record<TestStatus, string> = {
    untested: 'bg-slate-100 text-slate-600 border-slate-200',
    passed:   'bg-green-100 text-green-700 border-green-200',
    failed:   'bg-red-100 text-red-700 border-red-200',
    blocked:  'bg-orange-100 text-orange-700 border-orange-200',
    retest:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    skipped:  'bg-gray-100 text-gray-600 border-gray-200',
};


const STATUS_BAR: Record<TestStatus, string> = {
    passed:   'bg-green-500',
    failed:   'bg-red-500',
    blocked:  'bg-orange-400',
    retest:   'bg-yellow-400',
    skipped:  'bg-gray-400',
    untested: 'bg-slate-200',
};


function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}


function StatusBadge({ status }: { status: TestStatus }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[status]}`}>
            {status}
        </span>
    );
}


// ── Progress bar ──────────────────────────────────────────────────────────────


function ProgressBar({ run }: { run: TestRun }) {
    const total =
        run.passed_count + run.failed_count + run.blocked_count +
        run.untested_count + run.retest_count + run.skipped_count;

    if (total === 0) return <div className="h-3 w-full rounded-full bg-muted" />;

    const segments: { key: TestStatus; count: number }[] = [
        { key: 'passed',   count: run.passed_count },
        { key: 'failed',   count: run.failed_count },
        { key: 'blocked',  count: run.blocked_count },
        { key: 'retest',   count: run.retest_count },
        { key: 'skipped',  count: run.skipped_count },
        { key: 'untested', count: run.untested_count },
    ].filter((s): s is { key: TestStatus; count: number } => s.count > 0);

    return (
        <div className="flex h-3 w-full overflow-hidden rounded-full" title={`${total} tests`}>
            {segments.map(s => (
                <div
                    key={s.key}
                    className={STATUS_BAR[s.key]}
                    style={{ width: `${(s.count / total) * 100}%` }}
                    title={`${s.key}: ${s.count}`}
                />
            ))}
        </div>
    );
}


// ── Single result dialog ──────────────────────────────────────────────────────


type ResultForm = {
    status: TestStatus;
    comment: string;
    elapsed: string;
    version: string;
    defect_url: string;
};


function ResultDialog({
    test,
    runId,
    open,
    onClose,
    statuses,
}: {
    test: TestInstance;
    runId: number;
    open: boolean;
    onClose: () => void;
    statuses: TestStatus[];
}) {
    const t = useTrans();
    const { data, setData, post, processing, reset } = useForm<ResultForm>({
        status:     test.status === 'untested' ? 'passed' : test.status,
        comment:    '',
        elapsed:    '',
        version:    '',
        defect_url: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(`/runs/${runId}/tests/${test.id}/results`, {
            onSuccess: () => { reset(); onClose(); },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle className="text-base font-medium">
                            {test.case?.title ?? `Test #${test.id}`}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Status picker */}
                    <div className="grid gap-2">
                        <Label>{t('app.runs.result.status')}</Label>
                        <div className="flex flex-wrap gap-2">
                            {statuses.filter(s => s !== 'untested').map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setData('status', s)}
                                    className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-opacity ${STATUS_BADGE[s]} ${data.status === s ? 'opacity-100 ring-2 ring-offset-1 ring-current' : 'opacity-60 hover:opacity-90'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="grid gap-2">
                        <Label htmlFor="comment">{t('app.runs.result.comment')}</Label>
                        <RichTextEditor
                            value={data.comment}
                            onChange={(v) => setData('comment', v)}
                        />
                    </div>

                    {/* Elapsed + Version */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="elapsed">{t('app.runs.result.elapsed')}</Label>
                            <input
                                id="elapsed"
                                value={data.elapsed}
                                onChange={(e) => setData('elapsed', e.target.value)}
                                placeholder="e.g. 5m or 1h 30m"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="version">{t('app.runs.result.version')}</Label>
                            <input
                                id="version"
                                value={data.version}
                                onChange={(e) => setData('version', e.target.value)}
                                placeholder="e.g. 1.4.2"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />
                        </div>
                    </div>

                    {/* Defect URL */}
                    <div className="grid gap-2">
                        <Label htmlFor="defect_url">{t('app.runs.result.defect_url')}</Label>
                        <input
                            id="defect_url"
                            type="url"
                            value={data.defect_url}
                            onChange={(e) => setData('defect_url', e.target.value)}
                            placeholder="https://jira.example.com/browse/BUG-123"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('app.common.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {t('app.runs.result.submit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


// ── Bulk result dialog ────────────────────────────────────────────────────────


function BulkResultDialog({
    tests,
    runId,
    open,
    onClose,
    statuses,
}: {
    tests: TestInstance[];
    runId: number;
    open: boolean;
    onClose: () => void;
    statuses: TestStatus[];
}) {
    const t = useTrans();
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkStatus, setBulkStatus]   = useState<TestStatus>('passed');
    const [comment, setComment]         = useState('');
    const [version, setVersion]         = useState('');
    const [processing, setProcessing]   = useState(false);

    function toggleAll() {
        if (selectedIds.size === tests.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(tests.map(t => t.id)));
        }
    }

    function toggleOne(id: number) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (selectedIds.size === 0) return;

        const results: BulkResultItem[] = Array.from(selectedIds).map(test_id => ({
            test_id,
            status: bulkStatus,
            comment: comment || undefined,
            version: version || undefined,
        }));

        setProcessing(true);
        router.post(
            `/runs/${runId}/bulk-results`,
            // Inertia v3 RequestPayload = Record<string, FormDataConvertible>.
            // A nested array of objects doesn't satisfy that constraint at the
            // type level, so we JSON-encode it and decode on the Laravel side.
            { results: JSON.stringify(results) },
            {
                onFinish: () => { setProcessing(false); onClose(); },
            },
        );
    }

    const untested = tests.filter(t => t.status === 'untested');

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{t('app.runs.bulk.title')}</DialogTitle>
                    </DialogHeader>

                    {/* Status + Version row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>{t('app.runs.result.status')}</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {statuses.filter(s => s !== 'untested').map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setBulkStatus(s)}
                                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-opacity ${STATUS_BADGE[s]} ${bulkStatus === s ? 'opacity-100 ring-2 ring-offset-1 ring-current' : 'opacity-60 hover:opacity-90'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="bulk-version">{t('app.runs.result.version')}</Label>
                            <input
                                id="bulk-version"
                                value={version}
                                onChange={e => setVersion(e.target.value)}
                                placeholder="e.g. 1.4.2"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="grid gap-2">
                        <Label htmlFor="bulk-comment">{t('app.runs.result.comment')}</Label>
                        <RichTextEditor
                            value={comment}
                            onChange={setComment}
                        />
                    </div>

                    {/* Test selector */}
                    <div className="grid gap-1.5">
                        <div className="flex items-center justify-between">
                            <Label>{t('app.runs.bulk.select_tests')}</Label>
                            <button
                                type="button"
                                onClick={toggleAll}
                                className="text-xs text-primary hover:underline"
                            >
                                {selectedIds.size === tests.length
                                    ? t('app.common.deselect_all')
                                    : t('app.common.select_all')}
                            </button>
                        </div>
                        <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                            {tests.map(test => (
                                <label
                                    key={test.id}
                                    className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(test.id)}
                                        onChange={() => toggleOne(test.id)}
                                        className="size-4 rounded border-input accent-primary"
                                    />
                                    <span className="flex-1 truncate">{test.case?.title ?? `Test #${test.id}`}</span>
                                    <StatusBadge status={test.status} />
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {selectedIds.size} {t('app.runs.bulk.selected')}
                            {untested.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedIds(new Set(untested.map(t => t.id)))}
                                    className="ml-2 text-primary hover:underline"
                                >
                                    {t('app.runs.bulk.select_untested')}
                                </button>
                            )}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('app.common.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing || selectedIds.size === 0}>
                            {t('app.runs.bulk.submit', { count: String(selectedIds.size) })}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


// ── Main page ─────────────────────────────────────────────────────────────────


const STATUS_COUNTS: Record<TestStatus, keyof TestRun> = {
    passed:   'passed_count',
    failed:   'failed_count',
    blocked:  'blocked_count',
    retest:   'retest_count',
    skipped:  'skipped_count',
    untested: 'untested_count',
};


export default function RunsShow({
    run,
    statuses,
}: {
    run: TestRun;
    statuses: TestStatus[];
}) {
    const t = useTrans();
    const [activeTest, setActiveTest] = useState<TestInstance | null>(null);
    const [showBulk, setShowBulk]     = useState(false);

    function toggleClose() {
        if (run.is_completed) {
            router.patch(`/runs/${run.id}/reopen`);
        } else {
            router.patch(`/runs/${run.id}/close`);
        }
    }

    function deleteRun() {
        if (!window.confirm(t('app.common.confirm_delete'))) return;
        router.delete(`/runs/${run.id}`);
    }

    const grouped = (run.tests ?? []).reduce<Record<string, TestInstance[]>>((acc, test) => {
        const key = test.case?.section?.name ?? t('app.test_cases.no_section');
        acc[key] = acc[key] ?? [];
        acc[key].push(test);
        return acc;
    }, {});

    return (
        <>
            <Head title={run.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="grid gap-1">
                        <h1 className="text-2xl font-semibold">{run.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            {run.suite?.name ?? '—'}
                            {run.milestone && <> · {run.milestone.name}</>}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {!run.is_completed && (run.tests ?? []).length > 0 && (
                            <Button variant="outline" onClick={() => setShowBulk(true)}>
                                {t('app.runs.bulk.button')}
                            </Button>
                        )}
                        <Button variant="outline" onClick={toggleClose}>
                            {run.is_completed
                                ? <><XCircle className="size-4" /> {t('app.runs.reopen')}</>
                                : <><CheckCircle2 className="size-4" /> {t('app.runs.close')}</>
                            }
                        </Button>
                        <Button variant="destructive" onClick={deleteRun}>
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Progress */}
                <Card>
                    <CardContent className="grid gap-3 pt-4">
                        <ProgressBar run={run} />
                        <div className="flex flex-wrap gap-4 text-sm">
                            {(['passed', 'failed', 'blocked', 'retest', 'skipped', 'untested'] as const).map((s) => (
                                <span key={s} className="flex items-center gap-1">
                                    <span className={`inline-block size-2.5 rounded-full ${STATUS_BAR[s]}`} />
                                    <span className="capitalize">{s}</span>
                                    <span className="font-semibold">{run[STATUS_COUNTS[s]] as number}</span>
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Test list */}
                {Object.entries(grouped).map(([section, tests]) => (
                    <div key={section} className="grid gap-2">
                        <h2 className="text-sm font-medium text-muted-foreground">{section}</h2>
                        {tests.map((test) => (
                            <div
                                key={test.id}
                                className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {test.case?.title ?? `Test #${test.id}`}
                                    </p>
                                    {test.latest_result && (
                                        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                                            {test.latest_result.comment && (
                                                <span className="truncate max-w-xs">{stripHtml(test.latest_result.comment)}</span>
                                            )}
                                            {test.latest_result.defect_url && (
                                                <a
                                                    href={test.latest_result.defect_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-0.5 text-destructive hover:underline shrink-0"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="size-3" />
                                                    {t('app.runs.result.defect')}
                                                </a>
                                            )}
                                            {test.latest_result.version && (
                                                <span className="shrink-0">v{test.latest_result.version}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <StatusBadge status={test.status} />
                                    {!run.is_completed && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setActiveTest(test)}
                                        >
                                            {t('app.runs.result.add')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}

                {(run.tests ?? []).length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            {t('app.runs.no_tests')}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Single result dialog */}
            {activeTest && (
                <ResultDialog
                    test={activeTest}
                    runId={run.id}
                    open={activeTest !== null}
                    onClose={() => setActiveTest(null)}
                    statuses={statuses}
                />
            )}

            {/* Bulk result dialog */}
            <BulkResultDialog
                tests={run.tests ?? []}
                runId={run.id}
                open={showBulk}
                onClose={() => setShowBulk(false)}
                statuses={statuses}
            />
        </>
    );
}


RunsShow.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Runs', href: '' },
    ],
};