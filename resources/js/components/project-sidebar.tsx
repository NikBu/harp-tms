import { Link, usePage } from '@inertiajs/react';
import {
    BarChart2,
    ClipboardList,
    ChevronsUpDown,
    FolderOpen,
    LayoutDashboard,
    ListChecks,
    MapPin,
    PlayCircle,
    BookOpen,
} from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { ProjectContext } from '@/types/navigation';

interface Props {
    project: ProjectContext;
}

export function ProjectSidebar({ project }: Props) {
    const page       = usePage<any>();
    const currentUrl = (page as any).url as string ?? '';
    const projects   = (page.props.accessibleProjects ?? []) as ProjectContext[];
    const base       = `/projects/${project.id}`;

    const todoCount  = (page.props.todoCount as number) ?? 0;

    const navItems = [
        { key: 'overview',   label: 'Overview',   icon: LayoutDashboard, href: `${base}/overview`,   extraMatch: null },
        { key: 'todo',       label: 'To Do',      icon: ListChecks,      href: `${base}/todo`,        extraMatch: null },
        { key: 'suites',     label: 'Cases',      icon: ClipboardList,   href: `${base}/suites`,      extraMatch: ['/suites/', '/cases/'] },
        { key: 'runs',       label: 'Runs',       icon: PlayCircle,      href: `${base}/runs`,        extraMatch: ['/runs/'] },
        { key: 'plans',      label: 'Plans',      icon: BookOpen,        href: `${base}/plans`,       extraMatch: ['/plans/'] },
        { key: 'milestones', label: 'Milestones', icon: MapPin,          href: `${base}/milestones`,  extraMatch: ['/milestones/'] },
        { key: 'reports',    label: 'Reports',    icon: BarChart2,       href: `${base}/reports`,     extraMatch: null },
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
                                <span className="truncate">{project.name}</span>
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
                                    href={`/projects/${p.id}/overview`}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center gap-2',
                                        p.id === project.id && 'font-medium',
                                    )}
                                >
                                    <FolderOpen className="h-3.5 w-3.5" />
                                    {p.name}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem asChild>
                            <Link href="/projects" className="flex w-full items-center gap-2 text-muted-foreground">
                                All projects…
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                       {navItems.map(({ key, label, icon: Icon, href, extraMatch }) => {
                        const isActive =
                            currentUrl.startsWith(href) ||
                            (extraMatch?.some((pattern) => currentUrl.includes(pattern)) ?? false);

                        return (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton asChild isActive={isActive}>
                                    <Link href={href}>
                                        <Icon className="h-4 w-4" />
                                        <span>{label}</span>
                                        {key === 'todo' && todoCount > 0 && (
                                            <Badge variant="secondary" className="ml-auto text-xs">
                                                {todoCount}
                                            </Badge>
                                        )}
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