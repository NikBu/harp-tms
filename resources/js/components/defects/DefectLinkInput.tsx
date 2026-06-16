import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Integration {
    id: number;
    provider: string;
    name?: string;
}

interface IssueMeta {
    id: string;
    title: string;
    status: string;
    url: string;
    assignee?: string | null;
    priority?: string | null;
}

interface Props {
    integrations: Integration[];
    onLink: (integrationId: number, issueId: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function DefectLinkInput({ integrations, onLink, disabled = false, placeholder }: Props) {
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(
        integrations[0] ?? null,
    );
    const [value, setValue] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
    const [preview, setPreview] = useState<IssueMeta | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lookup = useCallback(
        (issueId: string, integration: Integration) => {
            if (!issueId.trim()) {
                setStatus('idle');
                setPreview(null);
                return;
            }
            setStatus('loading');
            clearTimeout(debounceRef.current ?? undefined);
            debounceRef.current = setTimeout(async () => {
                try {
                    const res = await axios.get(
                        route('api.defects.lookup', {
                            integration: integration.id,
                            issueId: issueId.trim(),
                        }),
                    );
                    setPreview(res.data as IssueMeta);
                    setStatus('found');
                } catch {
                    setPreview(null);
                    setStatus('not_found');
                }
            }, 400);
        },
        [],
    );

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const v = e.target.value;
        setValue(v);
        if (selectedIntegration) lookup(v, selectedIntegration);
    }

    function handleIntegrationChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const found = integrations.find((i) => i.id === Number(e.target.value)) ?? null;
        setSelectedIntegration(found);
        setStatus('idle');
        setPreview(null);
        if (found && value) lookup(value, found);
    }

    function handleLink() {
        if (status === 'found' && preview && selectedIntegration) {
            onLink(selectedIntegration.id, preview.id);
            setValue('');
            setStatus('idle');
            setPreview(null);
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                {integrations.length > 1 && (
                    <select
                        value={selectedIntegration?.id ?? ''}
                        onChange={handleIntegrationChange}
                        disabled={disabled}
                        className="border-border bg-surface text-text rounded-md border px-2 py-1.5 text-sm"
                    >
                        {integrations.map((i) => (
                            <option key={i.id} value={i.id}>
                                {i.name ?? i.provider}
                            </option>
                        ))}
                    </select>
                )}
                <div className="relative flex-1">
                    <Search className="text-text-faint absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                    <Input
                        className="pl-8"
                        value={value}
                        onChange={handleChange}
                        placeholder={placeholder ?? 'Issue ID or key (e.g. 123 or PROJ-42)'}
                        disabled={disabled || !selectedIntegration}
                    />
                    {status === 'loading' && (
                        <Loader2 className="text-text-faint absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin" />
                    )}
                    {status === 'found' && (
                        <CheckCircle className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-success" />
                    )}
                    {status === 'not_found' && (
                        <XCircle className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-error" />
                    )}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={status !== 'found' || disabled}
                    onClick={handleLink}
                >
                    Link
                </Button>
            </div>

            {status === 'found' && preview && (
                <div className="bg-surface-2 border-border rounded-md border px-3 py-2 text-sm">
                    <span className="font-medium text-text">{preview.id}</span>
                    <span className="text-text-muted mx-1.5">·</span>
                    <span className="text-text">{preview.title}</span>
                    {preview.status && (
                        <>
                            <span className="text-text-muted mx-1.5">·</span>
                            <span className="text-text-muted">{preview.status}</span>
                        </>
                    )}
                </div>
            )}

            {status === 'not_found' && (
                <p className="text-error text-xs">Issue not found. Check the ID and try again.</p>
            )}
        </div>
    );
}
