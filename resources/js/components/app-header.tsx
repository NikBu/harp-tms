import { Link, router, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    LayoutGrid,
    Plus,
    Search,
    ShieldCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { usePermissions } from '@/hooks/use-permissions';
import { useTrans } from '@/hooks/use-trans';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import type { ProjectContext } from '@/types/navigation';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

type TransFn = (key: string) => string;

/** Items injected into the + Add dropdown based on current URL segment */
function useAddItems(url: string, t: TransFn, projectId?: number): { label: string; href: string }[] {
    if (!projectId) return [];

    const base = `/projects/${projectId}`;

    // No add button on the to-do view.
    if (url.includes('/todo')) {
        return [];
    }

    if (url.includes('/suites') || url.includes('/cases')) {
        const suiteMatch = url.match(/\/suites\/(\d+)/);
        const suiteId = suiteMatch ? suiteMatch[1] : null;

        return [
            {
                label: t('app.test_cases.create'),
                href: suiteId ? `/suites/${suiteId}/cases/create` : `${base}/suites`,
            },
            {
                label: t('app.sections.add'),
                href: suiteId ? `/suites/${suiteId}` : `${base}/suites`,
            },
            { label: t('app.runs.create'), href: `${base}/runs/create` },
            { label: t('app.runs.milestones.create'), href: `${base}/milestones/create` },
        ];
    }

    if (url.includes('/runs')) {
        return [
            { label: t('app.runs.create'), href: `${base}/runs/create` },
            { label: t('app.plans.create'), href: `${base}/plans/create` },
        ];
    }

    if (url.includes('/milestones')) {
        return [{ label: t('app.runs.milestones.create'), href: `${base}/milestones/create` }];
    }

    if (url.includes('/plans')) {
        return [{ label: t('app.plans.create'), href: `${base}/plans/create` }];
    }

    // Default — common actions at project root.
    return [
        { label: t('app.runs.create'), href: `${base}/runs/create` },
        { label: t('app.runs.milestones.create'), href: `${base}/milestones/create` },
    ];
}

export function AppHeader({ breadcrumbs = [] }: Props) {
    const t = useTrans();
    const page = usePage<{ auth?: { user?: { name?: string; avatar?: string } } }>();
    const { auth } = page.props;
    const currentUrl = (page as { url?: string }).url ?? '';
    const project = page.props.currentProject as ProjectContext | null | undefined;
    const getInitials = useInitials();
    const { isSiteAdmin, canAdd } = usePermissions();

    const isInProject = Boolean(project);
    const isInAdmin = currentUrl.startsWith('/admin');
    const addItems = useAddItems(currentUrl, t, project?.id);

    return (
        <div className="sticky top-0 z-50 border-b border-sidebar-border/80 bg-background/80 backdrop-blur-sm">
            <div className="mx-auto flex h-12 items-center gap-3 px-4">

                {/* ── Mobile menu trigger ───────────────────────── */}
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <LayoutGrid className="h-4 w-4" />
                                <span className="sr-only">{t('app.navigation.main')}</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64 bg-sidebar p-0">
                            <SheetTitle className="sr-only">{t('app.navigation.main')}</SheetTitle>
                            <SheetHeader className="flex h-12 items-center border-b border-sidebar-border px-4">
                                <Link href={dashboard()}>
                                    <img src="/logo-main.png" alt="HARP TMS" className="h-7 w-auto object-contain dark:hidden" />
                                    <img src="/logo-main.png" alt="HARP TMS" className="hidden h-7 w-auto object-contain invert dark:block" />
                                </Link>
                            </SheetHeader>
                            <nav className="flex flex-col gap-1 p-3 text-sm">
                                <Link
                                    href={dashboard()}
                                    className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-sidebar-accent"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                    {t('app.navigation.dashboard')}
                                </Link>
                                <Link
                                    href="/projects"
                                    className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-sidebar-accent"
                                >
                                    <Search className="h-4 w-4" />
                                    {t('app.navigation.projects')}
                                </Link>
                                {isSiteAdmin && (
                                    <Link
                                        href="/admin"
                                        className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-sidebar-accent"
                                    >
                                        <ShieldCheck className="h-4 w-4" />
                                        {t('app.navigation.admin')}
                                    </Link>
                                )}
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* ── Logo ─────────────────────────────────────── */}
                <Link href={dashboard()} className="flex shrink-0 items-center" prefetch>
                    {/* Light mode logo */}
                    <img src="/logo-main.png" alt="HARP TMS" className="h-10 w-auto object-contain dark:hidden" />
                    {/* Dark mode logo — replace /logo-dark.png with actual asset when ready */}
                    <img src="/logo-main.png" alt="HARP TMS" className="hidden h-10 w-auto object-contain invert dark:block" />
                </Link>

                {/* ── Context-aware center section ─────────────── */}
                {isInProject && project ? (
                    <div className="ml-4 hidden items-center gap-3 lg:flex">
                        <span className="text-sm text-muted-foreground">/</span>
                        <Link
                            href={`/projects/${project.id}`}
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {project.name}
                        </Link>
                    </div>
                ) : (
                    <nav className="ml-4 hidden items-center gap-1 lg:flex">
                        <Link
                            href={dashboard()}
                            className={cn(
                                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                                currentUrl.startsWith('/dashboard')
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground',
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            {t('app.navigation.dashboard')}
                        </Link>
                    </nav>
                )}

                {/* ── Right side ───────────────────────────────��─ */}
                <div className="ml-auto flex items-center gap-2">

                    {/* + Add dropdown — only inside a project and for permitted roles */}
                    {isInProject && canAdd && addItems.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="default" size="sm" className="h-8 gap-1 px-3 text-xs font-medium">
                                    <Plus className="h-3.5 w-3.5" />
                                    {t('app.common.add')}
                                    <ChevronDown className="h-3 w-3 opacity-70" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {addItems.map((item) => (
                                    <DropdownMenuItem key={item.label} asChild>
                                        <Link href={item.href}>{item.label}</Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Search */}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Search className="h-4 w-4 opacity-70" />
                        <span className="sr-only">{t('app.common.search')}</span>
                    </Button>

                    {/* Theme toggle */}
                    <ThemeToggle />

                    {/* Administration button — site admins only, not already in admin */}
                    {isSiteAdmin && !isInAdmin && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="hidden h-8 items-center gap-1.5 px-3 text-xs lg:flex"
                            onClick={() => router.visit('/admin')}
                        >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {t('app.navigation.admin')}
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
