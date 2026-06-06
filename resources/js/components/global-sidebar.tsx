import { Link, usePage } from '@inertiajs/react';
import { BarChart2, FolderOpen, LayoutDashboard, Settings, ShieldCheck } from 'lucide-react';
import AppLogo from '@/components/app-logo';
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
import { usePermissions } from '@/hooks/use-permissions';
import { useTrans } from '@/hooks/use-trans';

export function GlobalSidebar() {
    const t               = useTrans();
    const page            = usePage<any>();
    const currentUrl      = (page as any).url as string ?? '';
    const { isSiteAdmin } = usePermissions();

    const mainItems = [
        { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
        { key: 'projects',  href: '/projects',  icon: FolderOpen      },
        { key: 'reports',   href: '/reports',   icon: BarChart2       },
    ];

    const systemItems = [
        ...(isSiteAdmin ? [{ key: 'admin',    href: '/admin',    icon: ShieldCheck }] : []),
        {                   key: 'settings', href: '/settings', icon: Settings    },
    ];

    return (
        <Sidebar>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{t('app.navigation.main')}</SidebarGroupLabel>
                    <SidebarMenu>
                        {mainItems.map(({ key, href, icon: Icon }) => (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={currentUrl.startsWith(href)}
                                    tooltip={t(`app.navigation.${key}`)}
                                >
                                    <Link href={href}>
                                        <Icon />
                                        <span>{t(`app.navigation.${key}`)}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>{t('app.navigation.system')}</SidebarGroupLabel>
                    <SidebarMenu>
                        {systemItems.map(({ key, href, icon: Icon }) => (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={currentUrl.startsWith(href)}
                                    tooltip={t(`app.navigation.${key}`)}
                                >
                                    <Link href={href}>
                                        <Icon />
                                        <span>{t(`app.navigation.${key}`)}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}