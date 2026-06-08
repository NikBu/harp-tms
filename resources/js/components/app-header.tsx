import { Link, router, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    LayoutGrid,
    Plus,
    Search,
    Settings,
    ShieldCheck,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import type { ProjectContext } from '@/types/navigation';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

/** Items injected into the + Add dropdown based on current URL segment */
function useAddItems(url: string, projectId?: number) {
    if (!projectId) return [];

    const base = `/projects/${projectId}`;

    if (url.includes('/cases'))      return [
        { label: 'Add Test Case',  href: `${base}/cases/create` },
        { label: 'Add Section',    href: `${base}/sections/create` },
    ];
    if (url.includes('/runs'))       return [
        { label: 'Add Test Run',   href: `${base}/runs/create` },
        { label: 'Add Test Plan',  href: `${base}/plans/create` },
    ];
    if (url.includes('/milestones')) return [
        { label: 'Add Milestone',  href: `${base}/milestones/create` },
    ];

    // Default — show all common actions when at project root
    return [
        { label: 'Add Test Case',  href: `${base}/cases/create` },
        { label: 'Add Test Run',   href: `${base}/runs/create` },
        { label: 'Add Milestone',  href: `${base}/milestones/create` },
    ];
}

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page          = usePage<any>();
    const { auth, url } = page.props as any;
    const currentUrl    = (page as any).url as string ?? url ?? '';
    const project       = page.props.currentProject as ProjectContext | null | undefined;
    const getInitials   = useInitials();
    const { isSiteAdmin, canAdd } = usePermissions();

    const isInProject   = Boolean(project);
    const isInAdmin     = currentUrl.startsWith('/admin');
    const addItems      = useAddItems(currentUrl, project?.id);

    return (
        <div className="border-b border-sidebar-border/80 bg-background">
            <div className="mx-auto flex h-14 items-center gap-3 px-4">

                {/* ── Mobile menu trigger ───────────────────────── */}
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <LayoutGrid className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64 bg-sidebar p-0">
                            <SheetTitle className="sr-only">Navigation</SheetTitle>
                            <SheetHeader className="flex h-14 items-center border-b border-sidebar-border px-4">
                                <Link href={dashboard()}>
                                    <AppLogoIcon className="h-6 w-6 fill-current" />
                                </Link>
                            </SheetHeader>
                            <nav className="flex flex-col gap-1 p-3 text-sm">
                                <Link
                                    href={dashboard()}
                                    className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-sidebar-accent"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                    Dashboard
                                </Link>
                                <Link
                                    href="/projects"
                                    className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-sidebar-accent"
                                >
                                    <Search className="h-4 w-4" />
                                    Projects
                                </Link>
                                {isSiteAdmin && (
                                    <Link
                                        href="/admin"
                                        className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-sidebar-accent"
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        Administration
                                    </Link>
                                )}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* ── Logo ─────────────────────────────────────── */}
                <Link href={dashboard()} className="flex shrink-0 items-center" prefetch>
                    <AppLogo />
                </Link>

                {/* ── Context-aware center section ─────────────── */}
                {isInProject && project ? (
                    /* Inside a project: show separator + project name linked to overview */
                    <div className="ml-4 hidden items-center gap-3 lg:flex">
                        <span className="text-sm text-muted-foreground">/</span>
                        <Link
                            href={`/projects/${project.id}/overview`}
                            className="text-sm font-medium transition-colors hover:text-foreground text-muted-foreground"
                        >
                            {project.name}
                        </Link>
                    </div>
                ) : (
                    /* Global view: Dashboard tab */
                    <nav className="ml-4 hidden items-center gap-1 lg:flex">
                        <Link
                            href={dashboard()}
                            className={cn(
                                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                                currentUrl === '/dashboard' || currentUrl.startsWith('/dashboard')
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground',
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Dashboard
                        </Link>
                    </nav>
                )}

                {/* ── Right side ───────────────────────────────── */}
                <div className="ml-auto flex items-center gap-2">

                    {/* + Add dropdown — only inside a project and for permitted roles */}
                    {isInProject && canAdd && addItems.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="default" size="sm" className="h-8 gap-1 px-3 text-xs font-medium">
                                    <Plus className="h-3.5 w-3.5" />
                                    Add
                                    <ChevronDown className="h-3 w-3 opacity-70" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {addItems.map((item) => (
                                    <DropdownMenuItem key={item.href} asChild>
                                        <Link href={item.href}>{item.label}</Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Search */}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Search className="h-4 w-4 opacity-70" />
                        <span className="sr-only">Search</span>
                    </Button>

                    {/* Administration button — site admins only, not already in admin */}
                    {isSiteAdmin && !isInAdmin && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="hidden h-8 items-center gap-1.5 px-3 text-xs lg:flex"
                            onClick={() => router.visit('/admin')}
                        >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Administration
                        </Button>
                    )}

                    {/* User avatar + dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0.5">
                                <Avatar className="h-7 w-7 rounded-full">
                                    <AvatarImage
                                        src={auth?.user?.avatar}
                                        alt={auth?.user?.name ?? 'User'}
                                    />
                                    <AvatarFallback className="rounded-full bg-muted text-xs">
                                        {getInitials(auth?.user?.name ?? '')}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {auth?.user && <UserMenuContent user={auth.user} />}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

            </div>
        </div>
    );
}
