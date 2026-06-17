import { Head, Link } from '@inertiajs/react';
import {
    Bug,
    ExternalLink,
    RefreshCw,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTrans } from '@/hooks/use-trans';
import type { ProjectContext } from '@/types/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DefectEntry {
    id: number;
    tracker_type: string;
    external_id: string;
    external_url: string;
    title: string | null;
    status: string | null;
    cache_refreshed_at: string | null;
    test_result_id: number;
    run_id: number;
    run_title: string;
    test_title: string;
}

interface Props {
    project: ProjectContext;
    defects: DefectEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TRACKER_LABELS: Record<string, string> = {
    github:      'GitHub',
    jira:        'Jira',
    gitlab:      'GitLab',
    youtrack:    'YouTrack',
    azure_devops:'Azure DevOps',
    bugzilla:    'Bugzilla',
    linear:      'Linear',
};

const TRACKER_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
    github:  'default',
    jira:    'secondary',
};

function trackerLabel(type: string): string {
    return TRACKER_LABELS[type] ?? type.replace('_', ' ');
}

function trackerVariant(type: string): 'default' | 'secondary' | 'outline' {
    return TRACKER_BADGE_VARIANT[type] ?? 'outline';
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectDefectsIndex({ project, defects }: Props) {
    const t = useTrans();
    const [query, setQuery] = useState('');

    const filtered = query.trim()
        ? defects.filter((d) =>
            d.external_id.toLowerCase().includes(query.toLowerCase()) ||
            (d.title ?? '').toLowerCase().includes(query.toLowerCase()) ||
            d.run_title.toLowerCase().includes(query.toLowerCase()) ||
            d.test_title.toLowerCase().includes(query.toLowerCase()),
        )
        : defects;

    return (
        <>
            <Head title={`Defects — ${project.name}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="grid gap-1">
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            <Bug className="size-6" />
                            {t('app.defects.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('app.defects.description')}
                        </p>
                    </div>
                </div>

                {/* Search bar */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                        placeholder={t('app.common.search')}
                        className="pl-8"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                {/* Content */}
                {filtered.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                            <Bug className="size-10 opacity-30" />
                            <p className="text-sm">
                                {query
                                    ? t('app.common.no_results')
                                    : t('app.defects.empty')}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="overflow-hidden rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('app.defects.issue')}</TableHead>
                                    <TableHead>{t('app.defects.title')}</TableHead>
                                    <TableHead>{t('app.defects.tracker')}</TableHead>
                                    <TableHead>{t('app.defects.status')}</TableHead>
                                    <TableHead>{t('app.defects.run')}</TableHead>
                                    <TableHead>{t('app.defects.test')}</TableHead>
                                    <TableHead className="text-right">{t('app.defects.refreshed')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((defect) => (
                                    <TableRow key={defect.id}>
                                        {/* External ID + link */}
                                        <TableCell>
                                            <a
                                                href={defect.external_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 font-mono text-sm font-medium text-primary hover:underline"
                                            >
                                                {defect.external_id}
                                                <ExternalLink className="size-3 opacity-60" />
                                            </a>
                                        </TableCell>

                                        {/* Title */}
                                        <TableCell className="max-w-xs truncate text-sm">
                                            {defect.title ?? <span className="italic text-muted-foreground">—</span>}
                                        </TableCell>

                                        {/* Tracker badge */}
                                        <TableCell>
                                            <Badge variant={trackerVariant(defect.tracker_type)}>
                                                {trackerLabel(defect.tracker_type)}
                                            </Badge>
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            {defect.status
                                                ? <span className="text-sm">{defect.status}</span>
                                                : <span className="text-muted-foreground">—</span>}
                                        </TableCell>

                                        {/* Run link */}
                                        <TableCell>
                                            <Link
                                                href={`/projects/${project.id}/runs/${defect.run_id}`}
                                                className="text-sm hover:underline"
                                            >
                                                {defect.run_title}
                                            </Link>
                                        </TableCell>

                                        {/* Test title */}
                                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                            {defect.test_title}
                                        </TableCell>

                                        {/* Last refreshed */}
                                        <TableCell className="text-right">
                                            {defect.cache_refreshed_at ? (
                                                <span
                                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                                                    title={new Date(defect.cache_refreshed_at).toLocaleString()}
                                                >
                                                    <RefreshCw className="size-3" />
                                                    {new Date(defect.cache_refreshed_at).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </>
    );
}

ProjectDefectsIndex.layout = {
    project: true,
};
