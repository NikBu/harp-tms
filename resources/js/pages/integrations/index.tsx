import { Head } from '@inertiajs/react';
import {
    GitBranch,
    Github,
    Plug,
    Webhook,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';

interface Integration {
    key: string;
    name: string;
    desc: string;
}

const ICONS: Record<string, LucideIcon> = {
    jira: Plug,
    github: Github,
    gitlab: GitBranch,
    slack: Webhook,
    pagerduty: Plug,
    zapier: Zap,
    jenkins: Plug,
    azure_devops: Plug,
};

export default function IntegrationsIndex({
    integrations,
}: {
    project: { id: number; name: string };
    integrations: Integration[];
}) {
    const t = useTrans();

    function configure() {
        toast.info(t('app.integrations.coming_soon'));
    }

    return (
        <>
            <Head title={t('app.integrations.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">{t('app.integrations.title')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('app.integrations.description')}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {integrations.map((integration) => {
                        const Icon = ICONS[integration.key] ?? Plug;
                        return (
                            <Card key={integration.key} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                                            <Icon className="size-5 text-muted-foreground" />
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {t('app.integrations.coming_soon')}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-base">{integration.name}</CardTitle>
                                    <CardDescription>
                                        {t(`app.integrations.providers.${integration.key}`)}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="mt-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={configure}
                                    >
                                        {t('app.integrations.configure')}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

IntegrationsIndex.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
