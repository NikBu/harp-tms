import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronRight,
    Github,
    GitBranch,
    Plug,
    Trash2,
    XCircle,
    Clock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
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
import { dashboard } from '@/routes';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PluginEntry {
    key:     string;
    name:    string;
    live:    boolean;   // true = Jira/GitHub MVP; false = coming soon stub
}

export interface SavedPlugin {
    id:               number;
    integration_type: string;
    name:             string;
    config:           Record<string, string>;
    is_active:        boolean;
}

interface Props {
    plugins: PluginEntry[];
    saved:   SavedPlugin[];
}

// ── Field definitions ─────────────────────────────────────────────────────────

type FieldDef = { key: string; label: string; placeholder?: string; type?: string };

const CRED_FIELDS: Record<string, FieldDef[]> = {
    jira: [
        { key: 'email', label: 'Atlassian Email',  placeholder: 'you@example.com' },
        { key: 'token', label: 'API Token',         placeholder: 'Your Jira API token', type: 'password' },
    ],
    github: [
        { key: 'token', label: 'Personal Access Token', placeholder: 'ghp_…', type: 'password' },
    ],
};

const CONFIG_FIELDS: Record<string, FieldDef[]> = {
    jira: [
        { key: 'base_url',    label: 'Jira URL',    placeholder: 'https://yoursite.atlassian.net' },
        { key: 'project_key', label: 'Project Key', placeholder: 'e.g. TMS' },
    ],
    github: [
        { key: 'owner', label: 'Owner (org or user)', placeholder: 'e.g. acme-corp' },
        { key: 'repo',  label: 'Repository',          placeholder: 'e.g. my-repo' },
    ],
};

const ICONS: Record<string, LucideIcon> = {
    jira:        Plug,
    github:      Github,
    gitlab:      GitBranch,
    youtrack:    Plug,
    azure_devops:Plug,
    bugzilla:    Plug,
    linear:      Plug,
};

// ── Configure dialog ──────────────────────────────────────────────────────────

type ConfigureForm = {
    credentials: Record<string, string>;
    config:      Record<string, string>;
    is_active:   boolean;
};

function ConfigureDialog({
    open,
    onClose,
    plugin,
    existing,
}: {
    open:     boolean;
    onClose:  () => void;
    plugin:   PluginEntry;
    existing: SavedPlugin | null;
}) {
    const t = useTrans();

    const { data, setData, post, patch, processing, reset } = useForm<ConfigureForm>({
        credentials: {},
        config:      existing?.config ?? {},
        is_active:   existing?.is_active ?? true,
    });

    const [testing, setTesting]       = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

    const credFields   = CRED_FIELDS[plugin.key]   ?? [];
    const configFields = CONFIG_FIELDS[plugin.key] ?? [];

    // Coming soon dialog
    if (!plugin.live) {
        return (
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="size-4" />
                            {plugin.name}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Support for <strong>{plugin.name}</strong> is coming soon.
                        This integration is planned for a future release.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const url      = existing
            ? `/admin/integration/defect-plugins/${existing.id}`
            : '/admin/integration/defect-plugins';
        const payload  = {
            integration_type: plugin.key,
            name:             plugin.name,
            credentials:      data.credentials,
            config:           data.config,
            is_active:        data.is_active,
        };
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (existing) {
            patch(url, { ...opts, data: payload } as Parameters<typeof patch>[1]);
        } else {
            post(url, { ...opts, data: payload } as Parameters<typeof post>[1]);
        }
    }

    function handleDelete() {
        if (!existing) return;
        if (!window.confirm(t('common.confirm_delete'))) return;
        router.delete(`/admin/integration/defect-plugins/${existing.id}`, {
            onSuccess: () => onClose(),
        });
    }

    async function handleTest() {
        if (!existing) return;
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(
                `/admin/integration/defect-plugins/${existing.id}/test`,
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
            setTestResult({ ok: false, message: t('integrations.test_failed') });
        } finally {
            setTesting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <form onSubmit={handleSubmit} className="grid gap-5">
                    <DialogHeader>
                        <DialogTitle>
                            {t('integrations.configure_title', { name: plugin.name })}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Credential fields */}
                    {credFields.length > 0 && (
                        <div className="grid gap-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {t('integrations.credentials')}
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
                                {t('integrations.configuration')}
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
                        <span className="text-sm">{t('integrations.enable')}</span>
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
                        {existing && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="mr-auto"
                                onClick={handleDelete}
                            >
                                <Trash2 className="size-3.5" />
                                {t('common.delete')}
                            </Button>
                        )}
                        {existing && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={testing}
                                onClick={handleTest}
                            >
                                {testing ? t('common.loading') : t('integrations.test_connection')}
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDefectPlugins({ plugins, saved }: Props) {
    const t = useTrans();

    const [configuring, setConfiguring] = useState<PluginEntry | null>(null);

    const savedMap = Object.fromEntries(saved.map(s => [s.integration_type, s]));

    return (
        <>
            <Head title="Defect Plugins" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">Defect Plugins</h1>
                    <p className="text-sm text-muted-foreground">
                        Configure default tracker connections for defect integration.
                        These serve as instance-wide defaults; projects can override credentials per-project.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {plugins.map((plugin) => {
                        const Icon     = ICONS[plugin.key] ?? Plug;
                        const existing = savedMap[plugin.key] ?? null;

                        return (
                            <Card
                                key={plugin.key}
                                className="flex flex-col cursor-pointer transition-shadow hover:shadow-md"
                                onClick={() => setConfiguring(plugin)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                                            <Icon className="size-5 text-muted-foreground" />
                                        </div>

                                        {!plugin.live ? (
                                            <Badge variant="outline" className="text-xs">
                                                Coming Soon
                                            </Badge>
                                        ) : existing ? (
                                            <Badge
                                                variant={existing.is_active ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {existing.is_active ? t('status.active') : t('status.inactive')}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs">
                                                {t('integrations.not_configured')}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-base">{plugin.name}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {plugin.live
                                            ? t(`integrations.providers.${plugin.key}`, undefined, `Connect ${plugin.name} as a defect tracker`)
                                            : `${plugin.name} integration is planned for a future release.`}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="mt-auto pt-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-between"
                                        onClick={(e) => { e.stopPropagation(); setConfiguring(plugin); }}
                                    >
                                        {plugin.live
                                            ? (existing ? t('integrations.edit') : t('integrations.configure'))
                                            : 'Learn more'}
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
                    plugin={configuring}
                    existing={savedMap[configuring.key] ?? null}
                />
            )}
        </>
    );
}

AdminDefectPlugins.layout = {
    breadcrumbs: [{ title: 'Administration', href: dashboard() }],
};
