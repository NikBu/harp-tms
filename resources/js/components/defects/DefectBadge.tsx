import React, { useState } from 'react';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DefectLinkData {
    id: number;
    tracker_type: string;
    external_id: string;
    external_url: string;
    title: string | null;
    status: string | null;
    cached_metadata: {
        assignee?: string | null;
        priority?: string | null;
        labels?: string[] | null;
    } | null;
    cache_refreshed_at: string | null;
}

const TRACKER_LABELS: Record<string, string> = {
    github:   'GH',
    jira:     'J',
    gitlab:   'GL',
    youtrack: 'YT',
    azure:    'ADO',
    bugzilla: 'BZ',
};

const STALE_MINUTES = 5;

function isStale(refreshedAt: string | null): boolean {
    if (!refreshedAt) return true;
    const diff = (Date.now() - new Date(refreshedAt).getTime()) / 60_000;
    return diff > STALE_MINUTES;
}

function csrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

interface Props {
    defect: DefectLinkData;
    resultId: number;
    onUnlinked?: (defectId: number) => void;
    onRefreshed?: (defect: DefectLinkData) => void;
    disabled?: boolean;
    className?: string;
}

export function DefectBadge({
    defect,
    resultId,
    onUnlinked,
    onRefreshed,
    disabled = false,
    className,
}: Props) {
    const [data, setData]             = useState<DefectLinkData>(defect);
    const [refreshing, setRefreshing] = useState(false);
    const [unlinking, setUnlinking]   = useState(false);

    const stale = isStale(data.cache_refreshed_at);
    const label = TRACKER_LABELS[data.tracker_type] ?? data.tracker_type.toUpperCase();

    async function handleRefresh(e: React.MouseEvent) {
        e.stopPropagation();
        if (refreshing) return;
        setRefreshing(true);
        try {
            const res = await fetch(
                route('defects.refresh', { result: resultId, defect: data.id }),
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                },
            );
            if (!res.ok) throw new Error('refresh failed');
            const updated = await res.json() as DefectLinkData;
            setData(updated);
            onRefreshed?.(updated);
        } catch {
            // silently fail — badge stays as-is
        } finally {
            setRefreshing(false);
        }
    }

    async function handleUnlink(e: React.MouseEvent) {
        e.stopPropagation();
        if (unlinking) return;
        setUnlinking(true);
        try {
            const res = await fetch(
                route('defects.destroy', { result: resultId, defect: data.id }),
                {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                },
            );
            if (!res.ok) throw new Error('unlink failed');
            onUnlinked?.(data.id);
        } catch {
            setUnlinking(false);
        }
    }

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                'bg-destructive/10 border-destructive/20 text-destructive',
                className,
            )}
        >
            {/* Tracker tag */}
            <span className="font-bold opacity-70">{label}</span>

            {/* Issue link */}
            <a
                href={data.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 hover:underline"
                onClick={e => e.stopPropagation()}
                title={data.title ?? data.external_id}
            >
                {data.external_id}
                <ExternalLink className="size-2.5 opacity-60" />
            </a>

            {/* Status */}
            {data.status && (
                <span className="opacity-60">· {data.status}</span>
            )}

            {/* Stale indicator */}
            {stale && !refreshing && (
                <span
                    className="size-1.5 rounded-full bg-yellow-400"
                    title="Metadata may be outdated"
                />
            )}

            {/* Refresh */}
            {!disabled && (
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="ml-0.5 opacity-50 hover:opacity-100 disabled:cursor-not-allowed"
                    title="Refresh status"
                >
                    <RefreshCw className={cn('size-2.5', refreshing && 'animate-spin')} />
                </button>
            )}

            {/* Unlink */}
            {!disabled && (
                <button
                    type="button"
                    onClick={handleUnlink}
                    disabled={unlinking}
                    className="opacity-50 hover:opacity-100 disabled:cursor-not-allowed"
                    title="Unlink defect"
                >
                    <X className="size-2.5" />
                </button>
            )}
        </span>
    );
}
