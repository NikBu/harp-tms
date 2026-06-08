import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Bell,
    BookOpen,
    Database,
    FileCode2,
    Globe,
    Key,
    KeyRound,
    Layers,
    List,
    Lock,
    Mail,
    Settings,
    ShieldCheck,
    Tag,
    Users,
    Webhook,
    CreditCard,
} from 'lucide-react';
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
import { dashboard } from '@/routes';

interface AdminNavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

interface AdminNavGroup {
    heading: string;
    items: AdminNavItem[];
}

const ADMIN_GROUPS: AdminNavGroup[] = [
    {
        heading: 'Site Settings',
        items: [
            { label: 'General',         href: '/admin/settings/general',        icon: Settings    },
            { label: 'Authentication',  href: '/admin/settings/authentication', icon: Lock        },
            { label: 'Email',           href: '/admin/settings/email',          icon: Mail        },
            { label: 'API',             href: '/admin/settings/api',            icon: Key         },
            { label: 'Auditing',        href: '/admin/settings/auditing',       icon: BookOpen    },
            { label: 'Data Management', href: '/admin/settings/data',           icon: Database    },
        ],
    },
    {
        heading: 'Users & Roles',
        items: [
            { label: 'Users',  href: '/admin/users',  icon: Users      },
            { label: 'Groups', href: '/admin/groups', icon: List       },
            { label: 'Roles',  href: '/admin/roles',  icon: ShieldCheck },
        ],
    },
    {
        heading: 'Projects',
        items: [
            { label: 'Projects', href: '/admin/projects', icon: Layers },
        ],
    },
    {
        heading: 'Customizations',
        items: [
            { label: 'Case Fields',   href: '/admin/customizations/case-fields',   icon: FileCode2 },
            { label: 'Result Fields', href: '/admin/customizations/result-fields', icon: FileCode2 },
            { label: 'Templates',     href: '/admin/customizations/templates',     icon: Globe     },
            { label: 'Statuses',      href: '/admin/customizations/statuses',      icon: Tag       },
        ],
    },
    {
        heading: 'Integration',
        items: [
            { label: 'Defect Plugins', href: '/admin/integration/defect-plugins', icon: KeyRound },
            { label: 'Webhooks',       href: '/admin/integration/webhooks',       icon: Webhook  },
        ],
    },
    {
        heading: 'Subscription',
        items: [
            { label: 'License & Plan', href: '/admin/subscription', icon: CreditCard },
        ],
    },
];

export function AdminSidebar() {
    const page       = usePage<any>();
    const currentUrl = (page as any).url as string ?? '';

    return (
        <Sidebar>
            <SidebarHeader className="border-b border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} className="flex items-center gap-2 text-sm font-medium">
                                <ArrowLeft className="h-4 w-4 shrink-0" />
                                <span>Administration</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {ADMIN_GROUPS.map((group) => (
                    <SidebarGroup key={group.heading}>
                        <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                            {group.heading}
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {group.items.map(({ label, href, icon: Icon }) => (
                                <SidebarMenuItem key={href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={currentUrl === href || currentUrl.startsWith(href + '/')}
                                    >
                                        <Link href={href}>
                                            <Icon className="h-4 w-4" />
                                            <span>{label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}