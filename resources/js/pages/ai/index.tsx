import { Head } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';

export default function AiIndex() {
    const t = useTrans();

    return (
        <>
            <Head title={t('app.ai.title')} />

            <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="size-8 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold">{t('app.ai.title')}</h1>
                <p className="text-base text-muted-foreground">{t('app.ai.coming_soon')}</p>
                <p className="max-w-md text-sm text-muted-foreground">
                    {t('app.ai.description')}
                </p>
                <Button variant="outline" asChild>
                    <a href="#">{t('app.ai.learn_more')}</a>
                </Button>
            </div>
        </>
    );
}

AiIndex.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
