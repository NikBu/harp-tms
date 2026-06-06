import { Head, Link, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { TestPlan, TestPlanEntry, PlanEntryRun, PlanConfigGroup } from '@/types/test-plan';

// ── Mini progress bar (reused from runs) ─────────────────────────────────────

function EntryProgress({ run }: { run: PlanEntryRun }) {
    const total = run.passed_count + run.failed_count + run.blocked_count +
                  run.untested_count + run.retest_count + run.skipped_count;
    if (total === 0) return <div className="h-1.5 w-24 rounded-full bg-muted" />;

    const pct = (n: number) => `${(n / total) * 100}%`;

    return (
        <div className="flex h-1.5 w-24 overflow-hidden rounded-full" title={`${total} tests`}>
            {run.passed_count   > 0 && <div className="bg-green-500"  style={{ width: pct(run.passed_count) }} />}
            {run.failed_count   > 0 && <div className="bg-red-500"    style={{ width: pct(run.failed_count) }} />}
            {run.blocked_count  > 0 && <div className="bg-orange-400" style={{ width: pct(run.blocked_count) }} />}
            {run.retest_count   > 0 && <div className="bg-yellow-400" style={{ width: pct(run.retest_count) }} />}
            {run.skipped_count  > 0 && <div className="bg-gray-400"   style={{ width: pct(run.skipped_count) }} />}
            {run.untested_count > 0 && <div className="bg-slate-200"  style={{ width: pct(run.untested_count) }} />}
        </div>
    );
}

// ── Add-entry dialog ──────────────────────────────────────────────────────────

type AddEntryForm = {
    run_id: string;
    assigned_to: string;
    configuration_ids: number[];
};

type AvailableRun = { id: number; name: string };
type Member      = { id: number; name: string };

function AddEntryDialog({
    planId,
    open,
    onClose,
    availableRuns,
    configGroups,
    members,
}: {
    planId: number;
    open: boolean;
    onClose: () => void;
    availableRuns: AvailableRun[];
    configGroups: PlanConfigGroup[];
    members: Member[];
}) {
    const t = useTrans();
    const { data, setData, post, processing, reset } = useForm<AddEntryForm>({
        run_id:            '',
        assigned_to:       '',
        configuration_ids: [],
    });

    function toggleConfig(id: number) {
        setData('configuration_ids',
            data.configuration_ids.includes(id)
                ? data.configuration_ids.filter((c) => c !== id)
                : [...data.configuration_ids, id]
        );
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(`/plans/${planId}/entries`, {
            onSuccess: () => { reset(); onClose(); },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{t('app.plans.add_run')}</DialogTitle>
                    </DialogHeader>

                    {/* Run picker */}
                    <div className="grid gap-2">
                        <Label>{t('app.navigation.runs')}</Label>
                        <Select value={data.run_id || 'none'} onValueChange={(v) => setData('run_id', v === 'none' ? '' : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('app.plans.select_run')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {availableRuns.map((r) => (
                                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Assign to */}
                    <div className="grid gap-2">
                        <Label>{t('app.runs.fields.assigned_to')}</Label>
                        <Select value={data.assigned_to || 'none'} onValueChange={(v) => setData('assigned_to', v === 'none' ? '' : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {members.map((m) => (
                                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Configurations (optional) */}
                    {configGroups.length > 0 && (
                        <div className="grid gap-2">
                            <Label>{t('app.plans.configurations')}</Label>
                            <div className="flex flex-wrap gap-2">
                                {configGroups.map((group) =>
                                    group.configurations.map((cfg) => (
                                        <button
                                            key={cfg.id}
                                            type="button"
                                            onClick={() => toggleConfig(cfg.id)}
                                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-opacity ${
                                                data.configuration_ids.includes(cfg.id)
                                                    ? 'border-primary bg-primary/10 text-primary opacity-100'
                                                    : 'border-border text-muted-foreground opacity-60 hover:opacity-90'
                                            }`}
                                        >
                                            {group.name} / {cfg.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('app.common.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing || !data.run_id}>
                            {t('app.plans.add_run')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Entry row ─────────────────────────────────────────────────────────────────

function EntryRow({
    entry,
    planId,
    planCompleted,
}: {
    entry: TestPlanEntry;
    planId: number;
    planCompleted: boolean;
}) {
    const t = useTrans();

    function removeEntry() {
        if (!window.confirm(t('app.common.confirm_delete'))) return;
        router.delete(`/plans/${planId}/entries/${entry.id}`);
    }

    return (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-3">
            <div className="min-w-0 flex-1">
                {entry.run ? (
                    <Link href={`/runs/${entry.run_id}`} className="text-sm font-medium hover:underline">
                        {entry.run.name}
                    </Link>
                ) : (
                    <span className="text-sm text-muted-foreground">Run #{entry.run_id}</span>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-2">
                    {entry.run && <EntryProgress run={entry.run} />}
                    {entry.configurations && entry.configurations.map((cfg) => (
                        <Badge key={cfg.id} variant="outline" className="text-xs">
                            {cfg.name}
                        </Badge>
                    ))}
                    {entry.assigned_to_user && (
                        <span className="text-xs text-muted-foreground">
                            → {entry.assigned_to_user.name}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {entry.run?.is_completed && (
                    <Badge variant="secondary" className="text-xs">{t('app.runs.completed')}</Badge>
                )}
                {!planCompleted && (
                    <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={removeEntry}>
                        <Trash2 className="size-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlansShow({
    plan,
    availableRuns,
    configGroups,
    members,
}: {
    plan: TestPlan;
    availableRuns: AvailableRun[];
    configGroups: PlanConfigGroup[];
    members: Member[];
}) {
    const t = useTrans();
    const [addOpen, setAddOpen] = useState(false);

    function toggleClose() {
        if (plan.is_completed) {
            router.patch(`/plans/${plan.id}/reopen`);
        } else {
            router.patch(`/plans/${plan.id}/close`);
        }
    }

    function deletePlan() {
        if (!window.confirm(t('app.common.confirm_delete'))) return;
        router.delete(`/plans/${plan.id}`);
    }

    return (
        <>
            <Head title={plan.name} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="grid gap-1">
                        <h1 className="text-2xl font-semibold">{plan.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            {plan.milestone?.name ?? '—'}
                            {plan.end_on && <> · {t('app.plans.ends')} {plan.end_on}</>}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={`/plans/${plan.id}/edit`}>
                                <Pencil className="size-4" />
                                {t('app.common.edit')}
                            </Link>
                        </Button>
                        <Button variant="outline" onClick={toggleClose}>
                            {plan.is_completed
                                ? <><XCircle className="size-4" /> {t('app.plans.reopen')}</>
                                : <><CheckCircle2 className="size-4" /> {t('app.plans.close')}</>
                            }
                        </Button>
                        <Button variant="destructive" onClick={deletePlan}>
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Meta */}
                {(plan.start_on || plan.end_on || plan.refs || plan.description) && (
                    <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                        {plan.start_on && (
                            <span>{t('app.plans.fields.start_on')}: <strong className="text-foreground">{plan.start_on}</strong></span>
                        )}
                        {plan.end_on && (
                            <span>{t('app.plans.fields.end_on')}: <strong className="text-foreground">{plan.end_on}</strong></span>
                        )}
                        {plan.refs && (
                            <span>{t('app.plans.fields.refs')}: <strong className="text-foreground">{plan.refs}</strong></span>
                        )}
                    </div>
                )}
                {plan.description && <p className="text-sm">{plan.description}</p>}

                {/* Entries */}
                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-muted-foreground">
                            {t('app.navigation.runs')} ({plan.entries?.length ?? 0})
                        </h2>
                        {!plan.is_completed && availableRuns.length > 0 && (
                            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                                <Plus className="size-4" />
                                {t('app.plans.add_run')}
                            </Button>
                        )}
                    </div>

                    {(!plan.entries || plan.entries.length === 0) ? (
                        <Card>
                            <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                {t('app.plans.no_entries')}
                            </CardContent>
                        </Card>
                    ) : (
                        plan.entries.map((entry) => (
                            <EntryRow
                                key={entry.id}
                                entry={entry}
                                planId={plan.id}
                                planCompleted={plan.is_completed}
                            />
                        ))
                    )}
                </div>
            </div>

            <AddEntryDialog
                planId={plan.id}
                open={addOpen}
                onClose={() => setAddOpen(false)}
                availableRuns={availableRuns}
                configGroups={configGroups}
                members={members}
            />
        </>
    );
}

PlansShow.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Plans', href: '' },
    ],
};