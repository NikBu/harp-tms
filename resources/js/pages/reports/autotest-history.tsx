import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Clock, GitBranch, XCircle, AlertCircle, SkipForward } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { index as projectsIndex } from '@/routes/projects';

// ── Types ─────────────────────────────────────────────────────────────────────

type AutoStatus = 'passed' | 'failed' | 'skipped' | 'blocked';

interface AutoRun {
    id: number;
    run_name: string;
    plan_name: string | null;
    env: string;
    branch: string;
    triggered_by: string;
    started_at: string;
    duration_s: number;
    status: AutoStatus;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
}

interface TestCaseStub {
    id: number;
    title: string;
    display_id: string;
}

interface Props {
    testCase: TestCaseStub;
    runs: AutoRun[];
    projectId: number;
}

// ── Static stub data ──────────────────────────────────────────────────────────

const STUB_RUNS: AutoRun[] = [
    {
        id: 71, run_name: 'CI/CD Regression #71', plan_name: 'Sprint 14 — Regression',
        env: 'staging', branch: 'main', triggered_by: 'GitHub Actions',
        started_at: '2026-06-19T06:00:00Z', duration_s: 14,
        status: 'passed', total: 42, passed: 42, failed: 0, skipped: 0,
    },
    {
        id: 68, run_name: 'CI/CD Regression #68', plan_name: 'Sprint 14 — Smoke',
        env: 'staging', branch: 'feature/auth-refactor', triggered_by: 'GitHub Actions',
        started_at: '2026-06-18T14:12:00Z', duration_s: 18,
        status: 'failed', total: 42, passed: 39, failed: 3, skipped: 0,
    },
    {
        id: 65, run_name: 'CI/CD Regression #65', plan_name: 'Sprint 13 — Regression',
        env: 'staging', branch: 'main', triggered_by: 'GitHub Actions',
        started_at: '2026-06-17T06:00:00Z', duration_s: 13,
        status: 'passed', total: 40, passed: 40, failed: 0, skipped: 0,
    },
    {
        id: 61, run_name: 'Manual API Run #61', plan_name: null,
        env: 'dev', branch: 'dev', triggered_by: 'Tester One',
        started_at: '2026-06-16T11:33:00Z', duration_s: 9,
        status: 'passed', total: 38, passed: 37, failed: 0, skipped: 1,
    },
    {
        id: 58, run_name: 'CI/CD Regression #58', plan_name: 'Sprint 13 — Smoke',
        env: 'staging', branch: 'main', triggered_by: 'GitHub Actions',
        started_at: '2026-06-14T06:00:00Z', duration_s: 21,
        status: 'failed', total: 38, passed: 35, failed: 3, skipped: 0,
    },
    {
        id: 54, run_name: 'CI/CD Regression #54', plan_name: 'Sprint 12 — Regression',
        env: 'staging', branch: 'main', triggered_by: 'GitHub Actions',
        started_at: '2026-06-12T06:00:00Z', duration_s: 12,
        status: 'passed', total: 36, passed: 36, failed: 0, skipped: 0,
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AutoStatus, { icon: React.ReactNode; badge: string; label: string }> = {
    passed:  { icon: <CheckCircle2 className="size-4 text-green-600" />,  badge: 'bg-green-100 text-green-700 border-green-200',  label: 'Passed'  },
    failed:  { icon: <XCircle      className="size-4 text-red-600" />,    badge: 'bg-red-100 text-red-700 border-red-200',        label: 'Failed'  },
    skipped: { icon: <SkipForward  className="size-4 text-gray-500" />,   badge: 'bg-gray-100 text-gray-600 border-gray-200',     label: 'Skipped' },
    blocked: { icon: <AlertCircle  className="size-4 text-orange-600" />, badge: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Blocked' },
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatDuration(s: number): string {
    if (s < 60) return `${s}с`;
    return `${Math.floor(s / 60)}м ${s % 60}с`;
}

function PassRateBar({ passed, total }: { passed: number; total: number }) {
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div
                    className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
    );
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ runs }: { runs: AutoRun[] }) {
    const total   = runs.length;
    const passed  = runs.filter((r) => r.status === 'passed').length;
    const failed  = runs.filter((r) => r.status === 'failed').length;
    const avgDur  = runs.length > 0 ? Math.round(runs.reduce((a, r) => a + r.duration_s, 0) / runs.length) : 0;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
                { label: 'Всего прогонов',  value: total,                 sub: 'за всё время'      },
                { label: 'Успешных',         value: `${passed} / ${total}`, sub: `${passRate}% pass rate` },
                { label: 'Упавших',          value: failed,                sub: failed > 0 ? 'требуют внимания' : 'нет проблем' },
                { label: 'Среднее время',    value: formatDuration(avgDur), sub: 'на исполнение кейса' },
            ].map((c) => (
                <Card key={c.label}>
                    <CardContent className="pt-4">
                        <p className="text-2xl font-bold tabular-nums">{c.value}</p>
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground">{c.sub}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AutotestHistory({ testCase, runs, projectId }: Props) {
    const entries = (runs && runs.length > 0) ? runs : STUB_RUNS;

    return (
        <>
            <Head title={`История автотестов — ${testCase?.title ?? 'Тест-кейс'}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">

                {/* Back */}
                <Link
                    href={`/projects/${projectId}/reports`}
                    className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    К отчётам проекта
                </Link>

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-semibold">История прохождения автотестов</h1>
                    {testCase && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            <span className="font-mono">{testCase.display_id}</span>
                            {' — '}
                            {testCase.title}
                        </p>
                    )}
                </div>

                {/* Summary */}
                <SummaryCards runs={entries} />

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Все прогоны</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-xs text-muted-foreground">
                                        <th className="px-4 py-2.5 font-medium">Прогон</th>
                                        <th className="px-4 py-2.5 font-medium">Статус</th>
                                        <th className="px-4 py-2.5 font-medium">Среда / Ветка</th>
                                        <th className="px-4 py-2.5 font-medium">Pass rate</th>
                                        <th className="px-4 py-2.5 font-medium">Время</th>
                                        <th className="px-4 py-2.5 font-medium">Запущен</th>
                                        <th className="px-4 py-2.5 font-medium">Дата</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((run) => {
                                        const cfg = STATUS_CONFIG[run.status];
                                        return (
                                            <tr key={run.id} className="border-b align-middle last:border-0 hover:bg-muted/30">
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">{run.run_name}</p>
                                                    {run.plan_name && (
                                                        <p className="text-xs text-muted-foreground">{run.plan_name}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                                                        {cfg.icon}
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{run.env}</p>
                                                    <p className="flex items-center gap-1 text-xs">
                                                        <GitBranch className="size-3 text-muted-foreground" />
                                                        {run.branch}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <PassRateBar passed={run.passed} total={run.total} />
                                                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                                                        {run.passed}✓ {run.failed > 0 ? `${run.failed}✗` : ''} {run.skipped > 0 ? `${run.skipped}⊘` : ''}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                                                        <Clock className="size-3" />
                                                        {formatDuration(run.duration_s)}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    {run.triggered_by}
                                                </td>
                                                <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                                                    {formatDate(run.started_at)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

AutotestHistory.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
    ],
};
