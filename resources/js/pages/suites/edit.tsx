import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    destroy,
    show,
    update,
} from '@/actions/App/Http/Controllers/SuiteController';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type { Suite } from '@/types';

type SuiteForm = {
    name: string;
    description: string;
};

export default function SuitesEdit({ suite }: { suite: Suite }) {
    const t = useTrans();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const { data, setData, patch, processing, errors } = useForm<SuiteForm>({
        name: suite.name,
        description: suite.description ?? '',
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        patch(update.url(suite.id));
    }

    function deleteSuite() {
        router.delete(destroy.url(suite.id));
    }

    return (
        <>
            <Head title={t('app.suites.edit')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <h1 className="text-2xl font-semibold">
                    {t('app.suites.edit')}
                </h1>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>{t('app.suites.edit')}</CardTitle>
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
                                <RichTextEditor
                                    value={data.description}
                                    onChange={(v) => setData('description', v)}
                                />
                                {errors.description ? (
                                    <p className="text-sm text-destructive">
                                        {errors.description}
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    {t('app.common.save')}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={show.url(suite.id)}>
                                        {t('app.common.cancel')}
                                    </Link>
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="ml-auto"
                                    onClick={() => setConfirmOpen(true)}
                                >
                                    {t('app.common.delete')}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t('app.common.confirm_delete')}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                        >
                            {t('app.common.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={deleteSuite}>
                            {t('app.common.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

SuitesEdit.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
