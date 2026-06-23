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

    function configure() {
        toast.info(t('app.integrations.coming_soon'));
    }

    return (
        <>
            <Head title={t('integrations.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">{t('integrations.title')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('integrations.description')}
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
                                        <Badge variant="secondary" className="text-xs">
                                            {t('app.integrations.coming_soon')}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-base">{integration.name}</CardTitle>
                                    <CardDescription>
                                        {t(`app.integrations.providers.${integration.key}`)}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="mt-auto pt-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-between"
                                        onClick={(e) => { e.stopPropagation(); setConfiguring(item); }}
                                    >
                                        {t('app.integrations.configure')}
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
