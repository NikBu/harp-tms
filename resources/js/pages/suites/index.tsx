import { Head, Link, router } from '@inertiajs/react';
import { ChevronRight, Layers, Plus } from 'lucide-react';
import {
    create,
    show,
} from '@/actions/App/Http/Controllers/SuiteController';
import { Button } from '@/components/ui/button';
import { index as projectsIndex } from '@/routes/projects';
import type { PaginatedData, Project, Suite } from '@/types';

function SuiteRow({ suite }: { suite: Suite }) {
    return (
        <Link
            href={show.url(suite.id)}
            className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
        >
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">
                        {suite.name}
                    </p>
                    {suite.description ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {suite.description}
                        </p>
                    ) : null}
                </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
    );
}

export default function SuitesIndex({
    project,
    suites,
}: {
    project: Project;
    suites: PaginatedData<Suite>;
}) {
    return (
        <>
            <Head title="Test Suites" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Test Suites</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {suites.total} {suites.total === 1 ? 'suite' : 'suites'}
                        </p>
                    </div>
                    <Button asChild size="sm">
                        <Link href={create.url(project.id)}>
                            <Plus className="size-4" />
                            New Suite
                        </Link>
                    </Button>
                </div>

                {suites.data.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
                        <Layers className="size-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            No test suites yet. Create one to start organising your cases.
                        </p>
                        <Button asChild size="sm" className="mt-2">
                            <Link href={create.url(project.id)}>
                                <Plus className="size-4" />
                                New Suite
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {suites.data.map((suite) => (
                            <SuiteRow key={suite.id} suite={suite} />
                        ))}

                        {suites.last_page > 1 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {suites.links.map((link) => (
                                    <Button
                                        key={link.label}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={link.url === null}
                                        onClick={() => {
                                            if (link.url) router.visit(link.url);
                                        }}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </>
    );
}

SuitesIndex.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Test Suites' },
    ],
};
