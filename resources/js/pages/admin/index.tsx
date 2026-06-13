import { Head } from '@inertiajs/react';
import {
    ClipboardList,
    FolderKanban,
    Layers,
    ListChecks,
    PlayCircle,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { dashboard } from '@/routes';

interface AdminStats {
    users: number;
    projects: number;
    test_cases: number;
    test_runs: number;
    suites: number;
    tests: number;
}

function StatCard({
    icon: Icon,
    label,
    value,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="grid">
                    <span className="text-2xl font-semibold">{value}</span>
                    <span className="text-sm text-muted-foreground">{label}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdminIndex({ stats }: { stats: AdminStats }) {
    const t = useTrans();

    const cards: { icon: LucideIcon; label: string; value: number }[] = [
        { icon: Users, label: t('app.admin.stats.users'), value: stats.users },
        { icon: FolderKanban, label: t('app.admin.stats.projects'), value: stats.projects },
        { icon: ClipboardList, label: t('app.admin.stats.test_cases'), value: stats.test_cases },
        { icon: PlayCircle, label: t('app.admin.stats.test_runs'), value: stats.test_runs },
        { icon: Layers, label: t('app.admin.stats.suites'), value: stats.suites },
        { icon: ListChecks, label: t('app.admin.stats.tests'), value: stats.tests },
    ];

    return (
        <>
            <Head title={t('app.admin.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">{t('app.admin.title')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('app.admin.overview')}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cards.map((card) => (
                        <StatCard
                            key={card.label}
                            icon={card.icon}
                            label={card.label}
                            value={card.value}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

AdminIndex.layout = {
    breadcrumbs: [{ title: 'Administration', href: dashboard() }],
};
