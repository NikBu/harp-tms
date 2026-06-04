import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrans } from '@/hooks/use-trans';
import {
    create as projectsCreate,
    index as projectsIndex,
    store,
} from '@/routes/projects';
import type { SuiteMode } from '@/types';

type ProjectForm = {
    name: string;
    description: string;
    suite_mode: SuiteMode;
};

export default function ProjectsCreate() {
    const t = useTrans();

    const { data, setData, post, processing, errors } = useForm<ProjectForm>({
        name: '',
        description: '',
        suite_mode: 1,
    });

    const suiteModes: { value: SuiteMode; label: string; desc: string }[] = [
        {
            value: 1,
            label: t('app.projects.suite_mode_single'),
            desc: t('app.projects.suite_mode_single_desc'),
        },
        {
            value: 2,
            label: t('app.projects.suite_mode_single_baseline'),
            desc: t('app.projects.suite_mode_single_baseline_desc'),
        },
        {
            value: 3,
            label: t('app.projects.suite_mode_multi'),
            desc: t('app.projects.suite_mode_multi_desc'),
        },
    ];

    function submit(event: React.FormEvent) {
        event.preventDefault();
        post(store().url);
    }

    return (
        <>
            <Head title={t('app.projects.create_title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <h1 className="text-2xl font-semibold">
                    {t('app.projects.create_title')}
                </h1>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>{t('app.projects.create')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('app.projects.name')}
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    placeholder={t(
                                        'app.projects.name_placeholder',
                                    )}
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
                                    {t('app.projects.description')}
                                </Label>
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    placeholder={t(
                                        'app.projects.description_placeholder',
                                    )}
                                    rows={4}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                {errors.description ? (
                                    <p className="text-sm text-destructive">
                                        {errors.description}
                                    </p>
                                ) : null}
                            </div>

                            <div className="grid gap-3">
                                <Label>{t('app.projects.suite_mode')}</Label>
                                <div className="grid gap-3">
                                    {suiteModes.map((mode) => (
                                        <label
                                            key={mode.value}
                                            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-checked:border-primary"
                                        >
                                            <input
                                                type="radio"
                                                name="suite_mode"
                                                className="mt-1"
                                                checked={
                                                    data.suite_mode ===
                                                    mode.value
                                                }
                                                onChange={() =>
                                                    setData(
                                                        'suite_mode',
                                                        mode.value,
                                                    )
                                                }
                                            />
                                            <div className="grid gap-0.5">
                                                <span className="text-sm font-medium">
                                                    {mode.label}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {mode.desc}
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {errors.suite_mode ? (
                                    <p className="text-sm text-destructive">
                                        {errors.suite_mode}
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    {t('app.common.create')}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ProjectsCreate.layout = {
    breadcrumbs: [
        {
            title: 'Projects',
            href: projectsIndex(),
        },
        {
            title: 'Create',
            href: projectsCreate(),
        },
    ],
};
