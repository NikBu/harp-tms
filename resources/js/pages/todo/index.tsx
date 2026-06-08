import { Head, Link } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';

type TodoStatus = 'untested' | 'failed' | 'retest';

interface TodoTest {
    id: number;
    run_id: number;
    case_id: number;
    status: TodoStatus;
    title: string;
    priority: string | null;
}

interface TodoGroup {
    run: { id: number; name: string };
    tests: TodoTest[];
}

const STATUS_VARIANT: Record<TodoStatus, 'secondary' | 'destructive' | 'outline'> = {
    untested: 'secondary',
    failed: 'destructive',
    retest: 'outline',
};

const PRIORITY_CLASS: Record<string, string> = {
    critical: 'border-red-400 text-red-600',
    high: 'border-orange-400 text-orange-600',
    medium: 'border-yellow-400 text-yellow-700',
    low: 'border-sky-400 text-sky-600',
};

type Filter = 'all' | TodoStatus;

export default function TodoIndex({
    todos,
    totalCount,
}: {
    project: { id: number; name: string };
    todos: TodoGroup[];
    totalCount: number;
}) {
    const t = useTrans();
    const [filter, setFilter] = useState<Filter>('all');

    const filteredGroups = todos
        .map((group) => ({
            ...group,
            tests: filter === 'all' ? group.tests : group.tests.filter((test) => test.status === filter),
        }))
        .filter((group) => group.tests.length > 0);

    return (
        <>
            <Head title={t('app.todo.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold">{t('app.todo.title')}</h1>
                    {totalCount > 0 && (
                        <Badge variant="secondary">{totalCount}</Badge>
                    )}
                </div>

                {totalCount === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <CheckCircle2 className="size-10 text-green-500" />
                            <p className="text-sm text-muted-foreground">
                                {t('app.todo.empty')}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                            <TabsList>
                                <TabsTrigger value="all">{t('app.todo.all')}</TabsTrigger>
                                <TabsTrigger value="untested">{t('app.todo.untested')}</TabsTrigger>
                                <TabsTrigger value="failed">{t('app.todo.failed')}</TabsTrigger>
                                <TabsTrigger value="retest">{t('app.todo.retest')}</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {filteredGroups.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t('app.todo.empty')}</p>
                        ) : (
                            filteredGroups.map((group) => (
                                <Card key={group.run.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{group.run.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-left text-muted-foreground">
                                                    <th className="p-3 font-medium">{t('app.todo.case_id')}</th>
                                                    <th className="p-3 font-medium">{t('app.test_cases.fields.title')}</th>
                                                    <th className="p-3 font-medium">{t('app.test_cases.fields.priority')}</th>
                                                    <th className="p-3 font-medium">{t('app.runs.result.status')}</th>
                                                    <th className="p-3" />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.tests.map((test) => (
                                                    <tr key={test.id} className="border-b last:border-0">
                                                        <td className="p-3 text-muted-foreground">#{test.case_id}</td>
                                                        <td className="p-3 font-medium">{test.title}</td>
                                                        <td className="p-3">
                                                            {test.priority ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`capitalize ${PRIORITY_CLASS[test.priority] ?? ''}`}
                                                                >
                                                                    {t(`app.requirements.priorities.${test.priority}`)}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            <Badge variant={STATUS_VARIANT[test.status]} className="capitalize">
                                                                {t(`app.runs.statuses.${test.status}`)}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <Button variant="ghost" size="sm" asChild>
                                                                <Link href={`/runs/${test.run_id}`}>
                                                                    {t('app.todo.view')}
                                                                </Link>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </>
                )}
            </div>
        </>
    );
}

TodoIndex.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
