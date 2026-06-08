import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, LayoutDashboard, Settings, Users } from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useTrans } from '@/hooks/use-trans';
import { dashboard } from '@/routes';

interface AdminNavItem {
    key: string;
    label: string;
    href: string;
    icon: React.ElementType;
    exact?: boolean;
}

export function AdminSidebar() {
    const t = useTrans();
    const page = usePage<{ url: string }>();
    const currentUrl = (page as { url?: string }).url ?? '';

    const items: AdminNavItem[] = [
        { key: 'overview', label: t('app.admin.overview'), href: '/admin', icon: LayoutDashboard, exact: true },
        { key: 'users', label: t('app.admin.users'), href: '/admin/users', icon: Users },
        { key: 'settings', label: t('app.admin.settings'), href: '/admin/settings', icon: Settings },
    ];

    return (
        <Sidebar>
            <SidebarHeader className="border-b border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} className="flex items-center gap-2 text-sm font-medium">
                                <ArrowLeft className="h-4 w-4 shrink-0" />
                                <span>{t('app.admin.title')}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        {t('app.admin.title')}
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {items.map(({ key, label, href, icon: Icon, exact }) => {
                            const isActive = exact
                                ? currentUrl === href
                                : currentUrl === href || currentUrl.startsWith(href + '/');

                            return (
                                <SidebarMenuItem key={key}>
                                    <SidebarMenuButton
                                        asChild
                                        className={cn(
                                            isActive && 'border-l-2 border-primary bg-primary/5 text-primary',
                                        )}
                                    >
                                        <Link href={href}>
                                            <Icon className="h-4 w-4" />
                                            <span>{label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
