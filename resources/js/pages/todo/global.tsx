import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, ChevronDown, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import { cn } from '@/lib/utils';

interface TodoCase {
    id: number;
    title: string;
    priority: string | null;
}

interface TodoRun {
    id: number;
    name: string;
    is_completed: boolean;
}

interface TodoPlan {
    id: number;
    name: string;
}

interface TodoGroup {
    project: { id: number; name: string };
    cases: TodoCase[];
    runs: TodoRun[];
    plans: TodoPlan[];
}

const PRIORITY_CLASS: Record<string, string> = {
    critical: 'border-red-400 text-red-600',
    high: 'border-orange-400 text-orange-600',
    medium: 'border-yellow-400 text-yellow-700',
    low: 'border-sky-400 text-sky-600',
};

export default function TodoGlobal({
    groups,
    totalCount,
}: {
    groups: TodoGroup[];
    totalCount: number;
}) {
    const t = useTrans();

    return (
        <>
            <Head title={t('todo.my_tasks')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold">{t('todo.my_tasks')}</h1>
                    {totalCount > 0 && <Badge variant="secondary">{totalCount}</Badge>}
                </div>

                {totalCount === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <CheckCircle2 className="size-10 text-green-500" />
                            <p className="text-sm text-muted-foreground">
                                {t('todo.global_empty')}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    groups.map((group) => (
                        <ProjectSection key={group.project.id} group={group} />
                    ))
                )}
            </div>
        </>
    );
}

function ProjectSection({ group }: { group: TodoGroup }) {
    const t = useTrans();
    const [open, setOpen] = useState(true);

    const count = group.cases.length + group.runs.length + group.plans.length;

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <Card>
                <CollapsibleTrigger asChild>
                    <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                    >
                        <span className="flex items-center gap-2 font-medium">
                            <FolderOpen className="size-4 text-muted-foreground" />
                            {group.project.name}
                            <Badge variant="secondary">{count}</Badge>
                        </span>
                        <ChevronDown
                            className={cn(
                                'size-4 text-muted-foreground transition-transform',
                                open && 'rotate-180',
                            )}
                        />
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="flex flex-col gap-4 pt-0">
                        {group.cases.length > 0 && (
                            <Subsection title={t('todo.cases')}>
                                {group.cases.map((c) => (
                                    <EntityRow
                                        key={`case-${c.id}`}
                                        href={`/cases/${c.id}`}
                                        label={c.title}
                                        view={t('todo.view')}
                                    >
                                        {c.priority && (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'capitalize',
                                                    PRIORITY_CLASS[c.priority] ?? '',
                                                )}
                                            >
                                                {t(`requirements.priorities.${c.priority}`)}
                                            </Badge>
                                        )}
                                    </EntityRow>
                                ))}
                            </Subsection>
                        )}

                        {group.runs.length > 0 && (
                            <Subsection title={t('todo.runs')}>
                                {group.runs.map((r) => (
                                    <EntityRow
                                        key={`run-${r.id}`}
                                        href={`/runs/${r.id}`}
                                        label={r.name}
                                        view={t('todo.view')}
                                    />
                                ))}
                            </Subsection>
                        )}

                        {group.plans.length > 0 && (
                            <Subsection title={t('todo.plans')}>
                                {group.plans.map((p) => (
                                    <EntityRow
                                        key={`plan-${p.id}`}
                                        href={`/plans/${p.id}`}
                                        label={p.name}
                                        view={t('todo.view')}
                                    />
                                ))}
                            </Subsection>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}

function Subsection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-1">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                {title}
            </h3>
            <div className="divide-y rounded-md border">{children}</div>
        </div>
    );
}

function EntityRow({
    href,
    label,
    view,
    children,
}: {
    href: string;
    label: string;
    view: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
            <div className="flex shrink-0 items-center gap-2">
                {children}
                <Button variant="ghost" size="sm" asChild>
                    <Link href={href}>{view}</Link>
                </Button>
            </div>
        </div>
    );
}

TodoGlobal.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
