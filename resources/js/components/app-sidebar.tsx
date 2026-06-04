import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    FolderOpen,
    Layers,
    ClipboardList,
    BookOpen,
    PlayCircle,
    Bug,
    Tag,
    BarChart2,
    Settings,
    ShieldCheck,
} from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
} from '@/components/ui/sidebar';
import  AppLogo  from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import { useTrans } from '@/hooks/use-trans';

const navItems = [
    { key: 'dashboard',   href: '/dashboard',   icon: LayoutDashboard },
    { key: 'projects',    href: '/projects',     icon: FolderOpen },
    { key: 'suites',      href: '/projects',     icon: Layers },
    { key: 'test_cases',  href: '/test-cases',   icon: ClipboardList },
    { key: 'test_plans',  href: '/test-plans',   icon: BookOpen },
    { key: 'test_runs',   href: '/test-runs',    icon: PlayCircle },
    { key: 'defects',     href: '/defects',      icon: Bug },
    { key: 'releases',    href: '/releases',     icon: Tag },
    { key: 'reports',     href: '/reports',      icon: BarChart2 },
];

const bottomItems = [
    { key: 'admin',    href: '/admin',    icon: ShieldCheck },
    { key: 'settings', href: '/settings', icon: Settings },
];

export function AppSidebar() {
    const t = useTrans();
    const { url } = usePage();

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
                    <SidebarGroupLabel>
                        {t('app.navigation.main')}
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {navItems.map(({ key, href, icon: Icon }) => (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={url.startsWith(href)}
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
                    <SidebarGroupLabel>
                        {t('app.navigation.system')}
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {bottomItems.map(({ key, href, icon: Icon }) => (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={url.startsWith(href)}
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