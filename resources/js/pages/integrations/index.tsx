import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronRight,
    GitBranch,
    Github,
    Plug,
    Trash2,
    Webhook,
    XCircle,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CatalogueItem {
    key: string;
    name: string;
}

interface SavedIntegration {
    id: number;
    integration_type: string;
    name: string;
    config: Record<string, string>;
    is_active: boolean;
}

interface Props {
    project: { id: number; name: string };
    catalogue: CatalogueItem[];
    saved: SavedIntegration[];
    trackerTypes: string[];
}

// ── Credential field definitions per provider ─────────────────────────────────

type FieldDef = { key: string; label: string; placeholder?: string; type?: string };

const CRED_FIELDS: Record<string, FieldDef[]> = {
    github: [
        { key: 'token', label: 'Personal Access Token', placeholder: 'ghp_…', type: 'password' },
    ],
    jira: [
        { key: 'email', label: 'Atlassian Email', placeholder: 'you@example.com' },
        { key: 'token', label: 'API Token', placeholder: 'Your Jira API token', type: 'password' },
    ],
    gitlab: [
        { key: 'token', label: 'Personal Access Token', placeholder: 'glpat-…', type: 'password' },
    ],
    youtrack: [
        { key: 'token', label: 'Permanent Token', placeholder: 'perm:…', type: 'password' },
    ],
    azure_devops: [
        { key: 'token', label: 'Personal Access Token', placeholder: 'PAT with Work Items scope', type: 'password' },
    ],
    bugzilla: [
        { key: 'api_key', label: 'API Key', placeholder: 'Your Bugzilla API key', type: 'password' },
    ],
    linear: [
        { key: 'api_key', label: 'Personal API Key', placeholder: 'lin_api_…', type: 'password' },
    ],
};

const CONFIG_FIELDS: Record<string, FieldDef[]> = {
    github: [
        { key: 'owner', label: 'Owner (org or user)', placeholder: 'e.g. acme-corp' },
        { key: 'repo',  label: 'Repository',          placeholder: 'e.g. my-repo' },
    ],
    jira: [
        { key: 'base_url',    label: 'Jira URL',      placeholder: 'https://yoursite.atlassian.net' },
        { key: 'project_key', label: 'Project Key',   placeholder: 'e.g. TMS' },
    ],
    gitlab: [
        { key: 'base_url',   label: 'GitLab URL',   placeholder: 'https://gitlab.com' },
        { key: 'project_id', label: 'Project ID',   placeholder: 'numeric project ID' },
    ],
    youtrack: [
        { key: 'base_url',   label: 'YouTrack URL', placeholder: 'https://company.myjetbrains.com/youtrack' },
        { key: 'project_id', label: 'Project ID',   placeholder: 'e.g. TMS' },
    ],
    azure_devops: [
        { key: 'organization', label: 'Organization', placeholder: 'e.g. my-org' },
        { key: 'project',      label: 'Project',      placeholder: 'e.g. My Project' },
    ],
    bugzilla: [
        { key: 'base_url', label: 'Bugzilla URL', placeholder: 'https://bugs.example.com' },
        { key: 'product',  label: 'Product',      placeholder: 'e.g. MyProduct' },
    ],
    linear: [
        { key: 'team_id', label: 'Team ID', placeholder: 'UUID from team settings' },
    ],
};

// ── Icons ─────────────────────────────────────────────────────────────────────

const ICONS: Record<string, LucideIcon> = {
    github:      Github,
    gitlab:      GitBranch,
    slack:       Webhook,
    zapier:      Zap,
    jira:        Plug,
    youtrack:    Plug,
    azure_devops:Plug,
    bugzilla:    Plug,
    linear:      Plug,
    pagerduty:   Plug,
    jenkins:     Plug,
};

// ── Configure drawer ──────────────────────────────────────────────────────────

type ConfigureForm = {
    credentials: Record<string, string>;
    config:      Record<string, string>;
    is_active:   boolean;
};

function ConfigureDialog({
    open,
    onClose,
    providerKey,
    providerName,
    project,
    existing,
    isTracker,
}: {
    open:         boolean;
    onClose:      () => void;
    providerKey:  string;
    providerName: string;
    project:      { id: number };
    existing:     SavedIntegration | null;
    isTracker:    boolean;
}) {
    const t = useTrans();

    const { data, setData, post, patch, processing, reset } = useForm<ConfigureForm>({
        credentials: {},
        config:      existing?.config ?? {},
        is_active:   existing?.is_active ?? true,
    });

    const [testing, setTesting]       = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

    const credFields   = CRED_FIELDS[providerKey]   ?? [];
    const configFields = CONFIG_FIELDS[providerKey] ?? [];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const url = existing
            ? `/projects/${project.id}/integrations/${existing.id}`
            : `/projects/${project.id}/integrations`;

        const opts = { onSuccess: () => { reset(); onClose(); } };

        const payload = {
            integration_type: providerKey,
            name:             providerName,
            credentials:      data.credentials,
            config:           data.config,
            is_active:        data.is_active,
        };

        if (existing) {
            patch(url, { ...opts, data: payload } as Parameters<typeof patch>[1]);
        } else {
            post(url, { ...opts, data: payload } as Parameters<typeof post>[1]);
        }
    }

    function handleDelete() {
        if (!existing) return;
        if (!window.confirm(t('app.common.confirm_delete'))) return;
        router.delete(`/projects/${project.id}/integrations/${existing.id}`, {
            onSuccess: () => onClose(),
        });
    }

    async function handleTest() {
        if (!existing) return;
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(
                `/projects/${project.id}/integrations/${existing.id}/test`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                    },
                },
            );
            const json = await res.json() as { ok: boolean; message: string };
            setTestResult(json);
        } catch {
            setTestResult({ ok: false, message: t('app.integrations.test_failed') });
        } finally {
            setTesting(false);
        }
    }

    // Non-tracker providers: coming soon
    if (!isTracker) {
        return (
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{providerName}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        {t('app.integrations.coming_soon_body')}
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>{t('app.common.cancel')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <form onSubmit={handleSubmit} className="grid gap-5">
                    <DialogHeader>
                        <DialogTitle>
                            {t('app.integrations.configure_title', { name: providerName })}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Credential fields */}
                    {credFields.length > 0 && (
                        <div className="grid gap-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {t('app.integrations.credentials')}
                            </p>
                            {credFields.map(f => (
                                <div key={f.key} className="grid gap-1.5">
                                    <Label htmlFor={`cred-${f.key}`}>{f.label}</Label>
                                    <input
                                        id={`cred-${f.key}`}
                                        type={f.type ?? 'text'}
                                        autoComplete="off"
                                        placeholder={f.placeholder ?? ''}
                                        value={data.credentials[f.key] ?? ''}
                                        onChange={e => setData('credentials', { ...data.credentials, [f.key]: e.target.value })}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Config fields */}
                    {configFields.length > 0 && (
                        <div className="grid gap-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {t('app.integrations.configuration')}
                            </p>
                            {configFields.map(f => (
                                <div key={f.key} className="grid gap-1.5">
                                    <Label htmlFor={`cfg-${f.key}`}>{f.label}</Label>
                                    <input
                                        id={`cfg-${f.key}`}
                                        type="text"
                                        placeholder={f.placeholder ?? ''}
                                        value={data.config[f.key] ?? ''}
                                        onChange={e => setData('config', { ...data.config, [f.key]: e.target.value })}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Active toggle */}
                    <label className="flex cursor-pointer items-center gap-3">
                        <input
                            type="checkbox"
                            checked={data.is_active}
                            onChange={e => setData('is_active', e.target.checked)}
                            className="size-4 rounded border-input accent-primary"
                        />
                        <span className="text-sm">{t('app.integrations.enable')}</span>
                    </label>

                    {/* Test result */}
                    {testResult && (
                        <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                            testResult.ok
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : 'border-red-200 bg-red-50 text-red-700'
                        }`}>
                            {testResult.ok
                                ? <CheckCircle2 className="size-4 shrink-0" />
                                : <XCircle className="size-4 shrink-0" />}
                            {testResult.message}
                        </div>
                    )}

                    <DialogFooter className="flex-wrap gap-2">
                        {/* Delete — only when editing */}
                        {existing && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="mr-auto"
                                onClick={handleDelete}
                            >
                                <Trash2 className="size-3.5" />
                                {t('app.common.delete')}
                            </Button>
                        )}

                        {/* Test connection — only when editing */}
                        {existing && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={testing}
                                onClick={handleTest}
                            >
                                {testing ? t('app.common.loading') : t('app.integrations.test_connection')}
                            </Button>
                        )}

                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('app.common.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {t('app.common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntegrationsIndex({ project, catalogue, saved, trackerTypes }: Props) {
    const t = useTrans();

    const [configuring, setConfiguring] = useState<CatalogueItem | null>(null);

    const savedMap = Object.fromEntries(saved.map(s => [s.integration_type, s]));

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
                    {catalogue.map((item) => {
                        const Icon      = ICONS[item.key] ?? Plug;
                        const existing  = savedMap[item.key] ?? null;
                        const isTracker = trackerTypes.includes(item.key);

                        return (
                            <Card
                                key={item.key}
                                className="flex flex-col cursor-pointer transition-shadow hover:shadow-md"
                                onClick={() => setConfiguring(item)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                                            <Icon className="size-5 text-muted-foreground" />
                                        </div>
                                        {existing ? (
                                            <Badge
                                                variant={existing.is_active ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {existing.is_active
                                                    ? t('app.status.active')
                                                    : t('app.status.inactive')}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs">
                                                {isTracker
                                                    ? t('app.integrations.not_configured')
                                                    : t('app.integrations.coming_soon_badge')}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-base">{item.name}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t(`app.integrations.providers.${item.key}`)}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="mt-auto pt-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-between"
                                        onClick={(e) => { e.stopPropagation(); setConfiguring(item); }}
                                    >
                                        {existing
                                            ? t('app.integrations.edit')
                                            : t('app.integrations.configure')}
                                        <ChevronRight className="size-3.5" />
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {configuring && (
                <ConfigureDialog
                    open
                    onClose={() => setConfiguring(null)}
                    providerKey={configuring.key}
                    providerName={configuring.name}
                    project={project}
                    existing={savedMap[configuring.key] ?? null}
                    isTracker={trackerTypes.includes(configuring.key)}
                />
            )}
        </>
    );
}

IntegrationsIndex.layout = {
    breadcrumbs: [{ title: 'Projects', href: projectsIndex() }],
};
