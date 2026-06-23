import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Clock, RotateCcw, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import {
    index as casesIndex,
    show as showCase,
} from '@/actions/App/Http/Controllers/TestCaseController';
import { index as projectsIndex } from '@/routes/projects';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryEntry {
    id: number;
    changed_at: string;
    changed_by_name: string;
    change_note: string | null;
    changed_fields: string[];
    snapshot: Record<string, unknown>;
}

interface TestCaseStub {
    id: number;
    title: string;
    suite_id: number;
}

interface Props {
    testCase: TestCaseStub;
    history: HistoryEntry[];
    suiteId: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
    title:         'Название',
    priority_id:   'Приоритет',
    status:        'Статус',
    preconditions: 'Предусловия',
    body:          'Описание',
    estimate:      'Оценка времени',
    references:    'Ссылки',
    steps:         'Шаги',
    bdd_scenario:  'BDD-сценарий',
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200' },
    2: { label: 'High',     color: 'bg-orange-100 text-orange-700 border-orange-200' },
    3: { label: 'Medium',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    4: { label: 'Low',      color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function FieldPill({ field }: { field: string }) {
    return (
        <span className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {FIELD_LABELS[field] ?? field}
        </span>
    );
}

function SnapshotPreview({ snapshot }: { snapshot: Record<string, unknown> }) {
    const priority = snapshot.priority_id as number | null;
    const status   = snapshot.status as string | null;
    const title    = snapshot.title as string | null;

    return (
        <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            {title && (
                <p><span className="text-muted-foreground">Название:</span> {title}</p>
            )}
            {priority && PRIORITY_LABELS[priority] && (
                <p>
                    <span className="text-muted-foreground">Приоритет: </span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_LABELS[priority].color}`}>
                        {PRIORITY_LABELS[priority].label}
                    </span>
                </p>
            )}
            {status && (
                <p><span className="text-muted-foreground">Статус:</span> {status}</p>
            )}
        </div>
    );
}

// ── Static stub data (injected by controller via Inertia) ─────────────────────

const STUB_HISTORY: HistoryEntry[] = [
    {
        id: 1,
        changed_at: '2026-06-18T14:32:00Z',
        changed_by_name: 'QA Lead One',
        change_note: 'Добавлены предусловия и уточнены шаги для проверки авторизации',
        changed_fields: ['preconditions', 'steps'],
        snapshot: { title: 'TC-042: Авторизация с валидными данными', priority_id: 2, status: 'approved' },
    },
    {
        id: 2,
        changed_at: '2026-06-17T11:05:00Z',
        changed_by_name: 'Tester One',
        change_note: 'Повышен приоритет после инцидента на prod',
        changed_fields: ['priority_id'],
        snapshot: { title: 'TC-042: Авторизация с валидными данными', priority_id: 3, status: 'approved' },
    },
    {
        id: 3,
        changed_at: '2026-06-15T09:18:00Z',
        changed_by_name: 'QA Lead One',
        change_note: 'Обновлён ожидаемый результат шага 3',
        changed_fields: ['steps'],
        snapshot: { title: 'TC-042: Авторизация с валидными данными', priority_id: 3, status: 'under review' },
    },
    {
        id: 4,
        changed_at: '2026-06-12T16:44:00Z',
        changed_by_name: 'QA Lead One',
        change_note: null,
        changed_fields: ['title', 'body'],
        snapshot: { title: 'Проверка авторизации', priority_id: 3, status: 'draft' },
    },
    {
        id: 5,
        changed_at: '2026-06-10T08:00:00Z',
        changed_by_name: 'Admin User',
        change_note: 'Тест-кейс создан',
        changed_fields: ['title', 'priority_id', 'status'],
        snapshot: { title: 'Проверка авторизации', priority_id: 4, status: 'draft' },
    },
];

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TestCaseHistory({ testCase, history, suiteId }: Props) {
    // Use real data if provided; fall back to static stub
    const entries = (history && history.length > 0) ? history : STUB_HISTORY;

    return (
        <>
            <Head title={`История — ${testCase.title}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">

                {/* Back link */}
                <Link
                    href={showCase.url(testCase.id)}
                    className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Вернуться к тест-кейсу
                </Link>

                {/* Title */}
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            История версий
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {testCase.title}
                        </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                        {entries.length} {entries.length === 1 ? 'запись' : 'записей'}
                    </Badge>
                </div>

                {/* Timeline */}
                <div className="relative flex flex-col gap-0">
                    {/* Vertical line */}
                    <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

                    {entries.map((entry, idx) => (
                        <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                            {/* Dot */}
                            <div className="relative z-10 mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm">
                                {idx === 0 ? (
                                    <Clock className="size-4 text-primary" />
                                ) : (
                                    <RotateCcw className="size-4 text-muted-foreground" />
                                )}
                            </div>

                            {/* Card */}
                            <Card className="flex-1">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="size-3.5 text-muted-foreground" />
                                            <span className="font-medium">{entry.changed_by_name}</span>
                                        </div>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {formatDate(entry.changed_at)}
                                        </span>
                                    </div>
                                    {entry.change_note && (
                                        <p className="mt-1 text-sm text-foreground">
                                            {entry.change_note}
                                        </p>
                                    )}
                                </CardHeader>

                                <CardContent className="pt-0">
                                    {/* Changed fields */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {entry.changed_fields.map((f) => (
                                            <FieldPill key={f} field={f} />
                                        ))}
                                    </div>

                                    {/* Snapshot preview */}
                                    <SnapshotPreview snapshot={entry.snapshot} />

                                    {/* Restore button — only for non-latest */}
                                    {idx > 0 && (
                                        <div className="mt-3 flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 text-xs"
                                                disabled
                                                title="Восстановление версии — в разработке"
                                            >
                                                <RotateCcw className="size-3" />
                                                Восстановить эту версию
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

TestCaseHistory.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
    ],
};
