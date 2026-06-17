import { Head, Link, useForm } from '@inertiajs/react';
import {
    index as suitesIndex,
    store,
} from '@/actions/App/Http/Controllers/SuiteController';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Project } from '@/types';

type SuiteForm = {
    name: string;
    description: string;
};

export default function SuitesCreate({ project }: { project: Project }) {
    const t = useTrans();

    const { data, setData, post, processing, errors } = useForm<SuiteForm>({
        name: '',
        description: '',
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        post(store.url(project.id));
    }

    return (
        <>
            <Head title={t('suites.create')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <h1 className="text-2xl font-semibold">
                    {t('suites.create')}
                </h1>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>{t('suites.create')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('projects.name')}
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    autoFocus
                                />
                                {errors.name ? (
                                    <p className="text-sm text-destructive">
                                        {errors.name}
                                    </p>
                                ) : null}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    {t('projects.description')}
                                </Label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    rows={4}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                {errors.description ? (
                                    <p className="text-sm text-destructive">
                                        {errors.description}
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    {t('common.create')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={suitesIndex.url(project.id)}>
                                        {t('common.cancel')}
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SuitesCreate.layout = {
    breadcrumbs: [
        {
            title: 'Projects',
            href: projectsIndex(),
        },
    ],
};
