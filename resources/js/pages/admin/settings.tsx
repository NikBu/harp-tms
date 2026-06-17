import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTrans } from '@/hooks/use-trans';
import { dashboard } from '@/routes';

interface SiteSettings {
    site_name: string;
    default_locale: string;
    max_projects_per_user: number;
}

export default function AdminSettings({ settings }: { settings: SiteSettings }) {
    const t = useTrans();

    const { data, setData, patch, processing, errors } = useForm({
        site_name: settings.site_name,
        default_locale: settings.default_locale,
        max_projects_per_user: settings.max_projects_per_user,
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        patch('/admin/settings', { preserveScroll: true });
    }

    return (
        <>
            <Head title={t('admin.settings')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <h1 className="text-2xl font-semibold">{t('admin.settings')}</h1>

                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle className="text-base">{t('admin.settings')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="site_name">{t('admin.site_name')}</Label>
                                <Input
                                    id="site_name"
                                    value={data.site_name}
                                    onChange={(e) => setData('site_name', e.target.value)}
                                />
                                {errors.site_name && (
                                    <p className="text-sm text-destructive">{errors.site_name}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="default_locale">{t('admin.default_language')}</Label>
                                <Select
                                    value={data.default_locale}
                                    onValueChange={(v) => setData('default_locale', v)}
                                >
                                    <SelectTrigger id="default_locale">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="ru">Русский</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="max_projects_per_user">
                                    {t('admin.max_projects')}
                                </Label>
                                <Input
                                    id="max_projects_per_user"
                                    type="number"
                                    min={1}
                                    value={data.max_projects_per_user}
                                    onChange={(e) =>
                                        setData('max_projects_per_user', Number(e.target.value))
                                    }
                                />
                                {errors.max_projects_per_user && (
                                    <p className="text-sm text-destructive">
                                        {errors.max_projects_per_user}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Button type="submit" disabled={processing}>
                                    {t('common.save')}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

AdminSettings.layout = {
    breadcrumbs: [{ title: 'Administration', href: dashboard() }],
};
