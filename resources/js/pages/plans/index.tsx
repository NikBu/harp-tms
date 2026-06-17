import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Circle, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project } from '@/types';
import type { TestPlan } from '@/types/test-plan';

export default function PlansIndex({
    project,
    plans,
}: {
    project: Project;
    plans: { data: TestPlan[]; current_page: number; last_page: number };
}) {
    const t = useTrans();

    return (
        <>
            <Head title={t('plans.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold">{t('plans.title')}</h1>
                    <Button asChild>
                        <Link href={`/projects/${project.id}/plans/create`}>
                            <Plus className="size-4" />
                            {t('plans.create')}
                        </Link>
                    </Button>
                </div>

                {plans.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            {t('plans.empty')}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-2">
                        {plans.data.map((plan) => (
                            <div
                                key={plan.id}
                                className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-3"
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    {plan.is_completed
                                        ? <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                                        : <Circle className="size-4 shrink-0 text-muted-foreground" />
                                    }
                                    <div className="min-w-0">
                                        <Link
                                            href={`/plans/${plan.id}`}
                                            className="truncate text-sm font-medium hover:underline"
                                        >
                                            {plan.name}
                                        </Link>
                                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                            {plan.entries_count !== undefined && (
                                                <span>{plan.entries_count} {t('plans.runs_count')}</span>
                                            )}
                                            {plan.end_on && (
                                                <span>{t('plans.ends')} {plan.end_on}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    {plan.milestone && (
                                        <Badge variant="outline" className="text-xs">
                                            {plan.milestone.name}
                                        </Badge>
                                    )}
                                    {plan.is_completed && (
                                        <Badge variant="secondary" className="text-xs">
                                            {t('plans.completed')}
                                        </Badge>
                                    )}
                                    <Button variant="ghost" size="icon" className="size-7" asChild>
                                        <Link href={`/plans/${plan.id}`}>
                                            <ChevronRight className="size-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

PlansIndex.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Plans', href: '' },
    ],
};