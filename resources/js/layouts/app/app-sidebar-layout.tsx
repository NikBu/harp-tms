import { usePage } from '@inertiajs/react';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const isOpen = usePage().props.sidebarOpen as boolean | undefined;

    return (
        <AppShell variant="sidebar">
            {/* Header spans full width at the top */}
            <AppHeader breadcrumbs={breadcrumbs} />

            {/* Sidebar + content sit side-by-side below the header */}
            <SidebarProvider defaultOpen={isOpen} className="flex-1 overflow-hidden">
                <AppSidebar />
                <SidebarInset className="overflow-x-hidden">
                    {children}
                </SidebarInset>
            </SidebarProvider>
        </AppShell>
    );
}
