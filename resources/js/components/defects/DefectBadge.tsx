import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DefectLink {
    id: number;
    tracker_type: string;
    external_id: string;
    external_url: string;
    title: string;
    status: string;
    cached_metadata?: Record<string, unknown>;
    cache_refreshed_at?: string | null;
}

interface Props {
    defect: DefectLink;
    resultId: number;
    readonly?: boolean;
    onRefreshed?: (updated: DefectLink) => void;
    onUnlinked?: (id: number) => void;
    staleThresholdMinutes?: number;
}

const TRACKER_LABELS: Record<string, string> = {
    github: 'GH',
    jira: 'Jira',
    gitlab: 'GL',
    youtrack: 'YT',
    azure_devops: 'ADO',
    bugzilla: 'BZ',
    linear: 'Lin',
};

function isStale(refreshedAt: string | null | undefined, thresholdMinutes: number): boolean {
    if (!refreshedAt) return true;
    const diff = (Date.now() - new Date(refreshedAt).getTime()) / 60_000;
    return diff > thresholdMinutes;
}

export function DefectBadge({
    defect,
    resultId,
    readonly = false,
    onRefreshed,
    onUnlinked,
    staleThresholdMinutes = 5,
}: Props) {
    const [refreshing, setRefreshing] = useState(false);
    const [unlinking, setUnlinking] = useState(false);
    const stale = isStale(defect.cache_refreshed_at, staleThresholdMinutes);
    const label = TRACKER_LABELS[defect.tracker_type] ?? defect.tracker_type;

    function handleRefresh(e: React.MouseEvent) {
        e.preventDefault();
        setRefreshing(true);
        router.post(
            route('defects.refresh', { result: resultId, defect: defect.id }),
            {},
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const updated = (page.props as Record<string, unknown>)['defect'] as DefectLink;
                    if (updated) onRefreshed?.(updated);
                },
                onFinish: () => setRefreshing(false),
            },
        );
    }

    function handleUnlink(e: React.MouseEvent) {
        e.preventDefault();
        if (!confirm('Unlink this defect?')) return;
        setUnlinking(true);
        router.delete(route('defects.destroy', { result: resultId, defect: defect.id }), {
            preserveScroll: true,
            onSuccess: () => onUnlinked?.(defect.id),
            onFinish: () => setUnlinking(false),
        });
    }

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                'bg-surface border-border text-text transition-colors',
                stale && 'border-warning/40 bg-warning-highlight/30',
            )}
        >
            <span className="font-semibold text-text-muted">{label}</span>
            <a
                href={defect.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover flex items-center gap-1"
            >
                {defect.external_id}
                <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-text-muted">·</span>
            <span className="text-text-muted">{defect.status}</span>

            {stale && (
                <span title="Metadata may be outdated">
                    <AlertCircle className="h-3 w-3 text-warning" />
                </span>
            )}

            {!readonly && (
                <>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="text-text-faint hover:text-text ml-0.5 disabled:opacity-50"
                        aria-label="Refresh defect status"
                        title="Refresh status"
                    >
                        <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
                    </button>
                    <button
                        type="button"
                        onClick={handleUnlink}
                        disabled={unlinking}
                        className="text-text-faint hover:text-error ml-0.5 disabled:opacity-50"
                        aria-label="Unlink defect"
                        title="Unlink"
                    >
                        ×
                    </button>
                </>
            )}
        </span>
    );
}
