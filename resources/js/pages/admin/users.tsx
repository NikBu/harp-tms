import { Head, Link, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTrans } from '@/hooks/use-trans';
import { dashboard } from '@/routes';
import type { PaginationLink } from '@/types';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    roles: string[];
    created_at: string;
}

interface Paginated {
    data: AdminUser[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
}

export default function AdminUsers({
    users,
    roles,
}: {
    users: Paginated;
    roles: string[];
}) {
    const t = useTrans();

    function changeRole(user: AdminUser, role: string) {
        router.patch(`/admin/users/${user.id}/role`, { role }, { preserveScroll: true });
    }

    function deleteUser(user: AdminUser) {
        if (!window.confirm(t('app.admin.confirm_delete_user'))) {
            return;
        }
        router.delete(`/admin/users/${user.id}`, { preserveScroll: true });
    }

    return (
        <>
            <Head title={t('app.admin.users')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">{t('app.admin.users')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {users.total} {t('app.admin.users').toLowerCase()}
                    </p>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="p-3 font-medium">{t('app.admin.fields.name')}</th>
                                    <th className="p-3 font-medium">{t('app.admin.fields.email')}</th>
                                    <th className="p-3 font-medium">{t('app.admin.fields.role')}</th>
                                    <th className="p-3 font-medium">{t('app.admin.fields.created')}</th>
                                    <th className="p-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {users.data.map((user) => {
                                    const role = user.roles[0] ?? 'user';
                                    return (
                                        <tr key={user.id} className="border-b last:border-0">
                                            <td className="p-3 font-medium">{user.name}</td>
                                            <td className="p-3 text-muted-foreground">{user.email}</td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={role === 'admin' ? 'default' : 'secondary'}
                                                        className="capitalize"
                                                    >
                                                        {role}
                                                    </Badge>
                                                    <Select
                                                        value={role}
                                                        onValueChange={(v) => changeRole(user, v)}
                                                    >
                                                        <SelectTrigger className="h-8 w-28">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {roles.map((r) => (
                                                                <SelectItem key={r} value={r} className="capitalize">
                                                                    {r}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </td>
                                            <td className="p-3 text-muted-foreground">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteUser(user)}
                                                    title={t('app.common.delete')}
                                                >
                                                    <Trash2 className="size-4 text-destructive" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {users.last_page > 1 && (
                    <div className="flex flex-wrap items-center gap-1">
                        {users.links.map((link, i) => (
                            <Button
                                key={i}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                asChild={!!link.url}
                            >
                                {link.url ? (
                                    <Link
                                        href={link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                )}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

AdminUsers.layout = {
    breadcrumbs: [{ title: 'Administration', href: dashboard() }],
};
