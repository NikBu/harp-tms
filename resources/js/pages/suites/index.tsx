import { Head, Link, router } from '@inertiajs/react';
import { Layers, Pencil, Plus } from 'lucide-react';
import {
    create,
    edit,
    show,
} from '@/actions/App/Http/Controllers/SuiteController';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { PaginatedData, Project, Suite } from '@/types';

function SuiteCard({ suite }: { suite: Suite }) {
    const t = useTrans();

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

    return (
        <>
            <Head title={t('app.suites.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">
                        {t('app.suites.title')}
                    </h1>
                    <Button asChild>
                        <Link href={create.url(project.id)}>
                            <Plus className="size-4" />
                            {t('app.suites.new_suite')}
                        </Link>
                    </Button>
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
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {suites.data.map((suite) => (
                                <SuiteCard key={suite.id} suite={suite} />
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
                                            if (link.url)
                                                router.visit(link.url);
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
