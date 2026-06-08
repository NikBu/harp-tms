import { Link, usePage } from '@inertiajs/react';
import { BarChart2, ChevronsUpDown, FolderOpen, LayoutDashboard, Plus, Settings, ShieldCheck } from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { usePermissions } from '@/hooks/use-permissions';
import { useTrans } from '@/hooks/use-trans';
import type { ProjectContext } from '@/types/navigation';

export function GlobalSidebar() {
    const t               = useTrans();
    const page            = usePage<any>();
    const currentUrl      = (page as any).url as string ?? '';
    const { isSiteAdmin, canAdd } = usePermissions();
    const projects = (page.props.accessibleProjects ?? []) as ProjectContext[];

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
            <SidebarHeader className="border-b border-sidebar-border pb-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton size="lg" className="w-full justify-between font-medium">
                            <span className="flex items-center gap-2 truncate">
                                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-muted-foreground">
                                    {t('app.navigation.projects')}
                                </span>
                            </span>
                            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-52"
                        align="start"
                    >
                        {projects.length > 0 ? (
                            projects.map((p) => (
                                <DropdownMenuItem key={p.id} asChild>
                                    <Link
                                        href={`/projects/${p.id}`}
                                        className="flex w-full cursor-pointer items-center gap-2"
                                    >
                                        <FolderOpen className="h-3.5 w-3.5" />
                                        {p.name}
                                    </Link>
                                </DropdownMenuItem>
                            ))
                        ) : (
                            <DropdownMenuItem disabled className="text-muted-foreground">
                                No projects yet
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/projects" className="flex w-full items-center gap-2 text-muted-foreground">
                                <FolderOpen className="h-3.5 w-3.5" />
                                All projects…
                            </Link>
                        </DropdownMenuItem>
                        {canAdd && (
                            <DropdownMenuItem asChild>
                                <Link href="/projects/create" className="flex w-full items-center gap-2">
                                    <Plus className="h-3.5 w-3.5" />
                                    New project
                                </Link>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
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
