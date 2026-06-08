import { Link, usePage } from '@inertiajs/react';
import {
    BarChart2,
    BookOpen,
    ChevronsUpDown,
    ClipboardList,
    FolderOpen,
    LayoutDashboard,
    ListChecks,
    MapPin,
    PlayCircle,
    Plug,
    ScrollText,
    Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
import { useTrans } from '@/hooks/use-trans';
import { cn } from '@/lib/utils';
import type { ProjectContext } from '@/types/navigation';

interface Props {
    project: ProjectContext;
}

interface NavItem {
    key: string;
    label: string;
    icon: LucideIcon;
    href: string;
    badge?: string;
}

export function ProjectSidebar({ project }: Props) {
    const t = useTrans();
    const page = usePage<{ url: string; accessibleProjects?: ProjectContext[]; todoCount?: number }>();
    const currentUrl = (page as { url?: string }).url ?? '';
    const projects = (page.props.accessibleProjects ?? []) as ProjectContext[];
    const base = `/projects/${project.id}`;

    const todoCount = (page.props.todoCount as number) ?? 0;

    const navItems: NavItem[] = [
        { key: 'overview', label: t('app.navigation.overview'), icon: LayoutDashboard, href: base },
        { key: 'todo', label: t('app.navigation.todo'), icon: ListChecks, href: `${base}/todo` },
        { key: 'suites', label: t('app.navigation.cases'), icon: ClipboardList, href: `${base}/suites` },
        { key: 'requirements', label: t('app.navigation.requirements'), icon: ScrollText, href: `${base}/requirements` },
        { key: 'runs', label: t('app.navigation.runs'), icon: PlayCircle, href: `${base}/runs` },
        { key: 'plans', label: t('app.navigation.plans'), icon: BookOpen, href: `${base}/plans` },
        { key: 'milestones', label: t('app.navigation.milestones'), icon: MapPin, href: `${base}/milestones` },
        { key: 'reports', label: t('app.navigation.reports'), icon: BarChart2, href: `${base}/reports` },
        { key: 'integrations', label: t('app.navigation.integrations'), icon: Plug, href: `${base}/integrations` },
        { key: 'ai', label: t('app.navigation.ai'), icon: Sparkles, href: `${base}/ai`, badge: t('app.ai.soon') },
    ];

    const projectInitial = project.name.charAt(0).toUpperCase();

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
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                                    {projectInitial}
                                </span>
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
                                    href={`/projects/${p.id}`}
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
                                {t('app.navigation.all_projects')}
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {navItems.map(({ key, label, icon: Icon, href, badge }) => {
                            const isActive =
                                key === 'overview'
                                    ? currentUrl === base || currentUrl === `${base}/`
                                    : currentUrl.startsWith(href);

                            return (
                                <SidebarMenuItem key={key}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive}
                                        className={cn(
                                            isActive &&
                                                'border-l-2 border-primary bg-primary/5 text-primary',
                                        )}
                                    >
                                        <Link href={href}>
                                            <Icon className="h-4 w-4" />
                                            <span>{label}</span>
                                            {key === 'todo' && todoCount > 0 && (
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-auto text-xs"
                                                >
                                                    {todoCount}
                                                </Badge>
                                            )}
                                            {badge && (
                                                <Badge
                                                    variant="outline"
                                                    className="ml-auto text-[10px] uppercase"
                                                >
                                                    {badge}
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
