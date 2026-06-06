import { Link, usePage } from '@inertiajs/react';
import {
    BarChart2,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    ChevronsUpDown,
    FolderOpen,
    LayoutDashboard,
    ListChecks,
    MapPin,
    PlayCircle,
} from 'lucide-react';
import { useState } from 'react';
import { NavUser } from '@/components/nav-user';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { ProjectContext } from '@/types/navigation';

interface Props {
    project: ProjectContext;
}

const SUB_ITEMS = [
    { key: 'overview', label: 'Overview' },
    { key: 'details',  label: 'Details'  },
    { key: 'status',   label: 'Status'   },
    { key: 'defects',  label: 'Defects'  },
];

interface CollapsibleNavItemProps {
    icon: React.ElementType;
    label: string;
    baseHref: string;
    currentUrl: string;
    projectId: number;
    segment: string;
}

function CollapsibleNavItem({
    icon: Icon,
    label,
    baseHref,
    currentUrl,
    projectId,
    segment,
}: CollapsibleNavItemProps) {
    const isActive  = currentUrl.startsWith(baseHref);
    const [open, setOpen] = useState(isActive);

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isActive} className="w-full justify-between">
                        <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {label}
                        </span>
                        {open
                            ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                            : <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                        }
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {SUB_ITEMS.map(({ key, label: subLabel }) => {
                            const href = `${baseHref}/${key}`;
                            return (
                                <SidebarMenuSubItem key={key}>
                                    <SidebarMenuSubButton
                                        asChild
                                        isActive={currentUrl === href || currentUrl.startsWith(href + '/')}
                                    >
                                        <Link href={href}>{subLabel}</Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            );
                        })}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

export function ProjectSidebar({ project }: Props) {
    const page       = usePage<any>();
    const currentUrl = (page as any).url as string ?? '';
    const projects   = (page.props.accessibleProjects ?? []) as ProjectContext[];
    const base       = `/projects/${project.id}`;

    // Todo count from shared props (0 fallback until backend wires it)
    const todoCount  = (page.props.todoCount as number) ?? 0;

    const flatItems = [
        { key: 'overview', label: 'Overview', icon: LayoutDashboard, href: `${base}/overview` },
        { key: 'todo',     label: 'To Do',    icon: ListChecks,       href: `${base}/todo` },
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
                        {/* Flat items: Overview, To Do */}
                        {flatItems.map(({ key, label, icon: Icon, href }) => (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={currentUrl.startsWith(href)}
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

                        {/* Collapsible: Cases, Runs, Milestones */}
                        <CollapsibleNavItem
                            icon={ClipboardList}
                            label="Cases"
                            baseHref={`${base}/cases`}
                            currentUrl={currentUrl}
                            projectId={project.id}
                            segment="cases"
                        />
                        <CollapsibleNavItem
                            icon={PlayCircle}
                            label="Runs"
                            baseHref={`${base}/runs`}
                            currentUrl={currentUrl}
                            projectId={project.id}
                            segment="runs"
                        />
                        <CollapsibleNavItem
                            icon={MapPin}
                            label="Milestones"
                            baseHref={`${base}/milestones`}
                            currentUrl={currentUrl}
                            projectId={project.id}
                            segment="milestones"
                        />

                        {/* Reports — flat */}
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={currentUrl.startsWith(`${base}/reports`)}
                            >
                                <Link href={`${base}/reports`}>
                                    <BarChart2 className="h-4 w-4" />
                                    <span>Reports</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}