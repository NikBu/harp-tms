import { Link, usePage } from '@inertiajs/react';
import {
    BarChart2,
    ChevronsUpDown,
    FolderOpen,
    LayoutDashboard,
    ScrollText,
    Settings,
    ShieldCheck,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/hooks/use-permissions';
import { useTrans } from '@/hooks/use-trans';
import { cn } from '@/lib/utils';

type ProjectOption = { id: number; name: string };

export function GlobalSidebar() {
    const t               = useTrans();
    const page            = usePage<any>();
    const currentUrl      = (page as any).url as string ?? '';
    const { isSiteAdmin } = usePermissions();

    const projects = (page.props.accessibleProjects ?? []) as ProjectOption[];
    const projectMatch = currentUrl.match(/\/projects\/(\d+)/);
    const currentProjectId = projectMatch ? Number(projectMatch[1]) : null;
    const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

    const reportsHref = currentProjectId
        ? `/projects/${currentProjectId}/reports`
        : '/reports';

    const mainItems = [
        { key: 'dashboard',    href: '/dashboard',  icon: LayoutDashboard },
        { key: 'projects',     href: '/projects',   icon: FolderOpen      },
        { key: 'reports',      href: reportsHref,   icon: BarChart2       },
        { key: 'requirements', href: '/requirements', icon: ScrollText    },
    ];

    const systemItems = [
        ...(isSiteAdmin ? [{ key: 'admin',    href: '/admin',    icon: ShieldCheck }] : []),
        {                   key: 'settings', href: '/settings', icon: Settings    },
    ];

    return (
        <Sidebar>
            {/* ── Project switcher ── */}
            <SidebarHeader className="border-b border-sidebar-border pb-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="w-full justify-between font-medium"
                        >
                            <span className="flex items-center gap-2 truncate">
                                <FolderOpen className="h-4 w-4 shrink-0" />
                                <span className="truncate">
                                    {currentProject?.name ?? t('app.navigation.select_project')}
                                </span>
                            </span>
                            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-52"
                        align="start"
                    >
                        {projects.map((p) => (
                            <DropdownMenuItem key={p.id} asChild>
                                <Link
                                    href={`/projects/${p.id}`}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center gap-2',
                                        p.id === currentProjectId && 'font-medium',
                                    )}
                                >
                                    <FolderOpen className="h-3.5 w-3.5" />
                                    {p.name}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem asChild>
                            <Link href="/projects" className="flex w-full items-center gap-2 text-muted-foreground">
                                {t('app.navigation.all_projects')}
                            </Link>
                        </DropdownMenuItem>
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
        </Sidebar>
    );
}
