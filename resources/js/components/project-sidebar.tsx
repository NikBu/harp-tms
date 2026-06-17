import { Link, usePage } from '@inertiajs/react';
import {
    BarChart2,
    Bug,
    ClipboardList,
    ChevronsUpDown,
    FolderOpen,
    LayoutDashboard,
    ListChecks,
    MapPin,
    PlayCircle,
    BookOpen,
    ScrollText,
} from 'lucide-react';
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
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useTrans } from '@/hooks/use-trans';
import type { ProjectContext } from '@/types/navigation';

interface Props {
    project: ProjectContext;
}

export function ProjectSidebar({ project }: Props) {
    const t = useTrans();
    const page = usePage<any>();
    const currentUrl = ((page as any).url as string) ?? '';
    const projects = (page.props.accessibleProjects ?? []) as ProjectContext[];
    const base = `/projects/${project.id}`;

    const todoCount = (page.props.todoCount as number) ?? 0;

    const navItems = [
        {
            key: 'overview',
            label: t('navigation.overview'),
            icon: LayoutDashboard,
            href: base,
        },
        {
            key: 'todo',
            label: t('navigation.todo'),
            icon: ListChecks,
            href: '/todo',
        },
        {
            key: 'suites',
            label: t('navigation.cases'),
            icon: ClipboardList,
            href: `${base}/suites`,
        },
        {
            key: 'requirements',
            label: t('navigation.requirements'),
            icon: ScrollText,
            href: `${base}/requirements`,
        },
        {
            key: 'runs',
            label: t('navigation.runs'),
            icon: PlayCircle,
            href: `${base}/runs`,
        },
        {
            key: 'plans',
            label: t('navigation.plans'),
            icon: BookOpen,
            href: `${base}/plans`,
        },
        {
            key: 'milestones',
            label: t('navigation.milestones'),
            icon: MapPin,
            href: `${base}/milestones`,
        },
        {
            key: 'defects',
            label: t('navigation.defects'),
            icon: Bug,
            href: `${base}/defects`,
        },
        {
            key: 'reports',
            label: t('navigation.reports'),
            icon: BarChart2,
            href: `${base}/reports`,
        },
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
                            <Link
                                href="/projects"
                                className="flex w-full items-center gap-2 text-muted-foreground"
                            >
                                {t('navigation.all_projects')}…
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {navItems.map(({ key, label, icon: Icon, href }) => (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={
                                        key === 'overview'
                                            ? currentUrl === base ||
                                              currentUrl === `${base}/`
                                            : currentUrl.startsWith(href)
                                    }
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
