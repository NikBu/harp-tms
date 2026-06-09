import { Head, Link, router } from '@inertiajs/react';
import { LayoutGrid, Layers, List, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTrans } from '@/hooks/use-trans';
import type { PaginatedData, Project, Suite } from '@/types';
import {
    create,
    edit,
    show,
} from '@/actions/App/Http/Controllers/SuiteController';
import { index as projectsIndex } from '@/routes/projects';

type ViewMode = 'grid' | 'list';

function SuiteCard({ suite, view }: { suite: Suite; view: ViewMode }) {
    const t = useTrans();

    if (view === 'list') {
        return (
            <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary hover:bg-accent/40">
                <Layers className="size-4 shrink-0 text-muted-foreground" />
                <Link href={show.url(suite.id)} className="min-w-0 flex-1 truncate font-medium">
                    {suite.name}
                </Link>
                {suite.description ? (
                    <span className="hidden truncate text-sm text-muted-foreground sm:block sm:max-w-xs lg:max-w-sm">
                        {suite.description}
                    </span>
                ) : null}
                <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-7 w-7 shrink-0"
                    title={t('app.common.edit')}
                >
                    <Link href={edit.url(suite.id)}>
                        <Pencil className="size-3.5" />
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <Card className="relative h-full transition-colors hover:border-primary">
            <Link href={show.url(suite.id)} className="block">
                <CardHeader>
                    <CardTitle className="truncate pr-8">
                        {suite.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                        {suite.description ?? ''}
                    </CardDescription>
                </CardHeader>
            </Link>
            <Button
                variant="ghost"
                size="icon"
                asChild
                className="absolute top-2 right-2"
                title={t('app.common.edit')}
            >
                <Link href={edit.url(suite.id)}>
                    <Pencil className="size-4" />
                </Link>
            </Button>
        </Card>
    );
}

export default function SuitesIndex({
    project,
    suites,
}: {
    project: Project;
    suites: PaginatedData<Suite>;
}) {
    const t = useTrans();
    const [view, setView] = useState<ViewMode>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('suites-view') as ViewMode) ?? 'grid';
        }
        return 'grid';
    });

    const changeView = (v: ViewMode) => {
        setView(v);
        localStorage.setItem('suites-view', v);
    };

    return (
        <>
            <Head title={t('app.suites.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">
                        {t('app.suites.title')}
                    </h1>
                    <div className="flex items-center gap-2">
                        {/* View toggle */}
                        <div className="flex items-center rounded-md border border-border">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    'h-8 w-8 rounded-r-none',
                                    view === 'grid' && 'bg-muted text-foreground',
                                )}
                                onClick={() => changeView('grid')}
                                title="Grid view"
                            >
                                <LayoutGrid className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    'h-8 w-8 rounded-l-none border-l border-border',
                                    view === 'list' && 'bg-muted text-foreground',
                                )}
                                onClick={() => changeView('list')}
                                title="List view"
                            >
                                <List className="size-4" />
                            </Button>
                        </div>

                        <Button asChild>
                            <Link href={create.url(project.id)}>
                                <Plus className="size-4" />
                                {t('app.suites.new_suite')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {suites.data.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
                        <Layers className="size-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            {t('app.suites.empty')}
                        </p>
                        <Button asChild className="mt-2">
                            <Link href={create.url(project.id)}>
                                <Plus className="size-4" />
                                {t('app.suites.new_suite')}
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className={cn(
                            view === 'grid'
                                ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                                : 'flex flex-col gap-2',
                        )}>
                            {suites.data.map((suite) => (
                                <SuiteCard
                                    key={suite.id}
                                    suite={suite}
                                    view={view}
                                />
                            ))}
                        </div>

                        {suites.last_page > 1 ? (
                            <div className="flex flex-wrap gap-1">
                                {suites.links.map((link) => (
                                    <Button
                                        key={link.label}
                                        variant={
                                            link.active ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        disabled={link.url === null}
                                        onClick={() => {
                                            if (link.url) {
                                                router.visit(link.url);
                                            }
                                        }}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </>
    );
}

SuitesIndex.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Test Cases' },
    ],
};
