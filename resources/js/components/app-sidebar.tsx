import { usePage } from '@inertiajs/react';
import { AdminSidebar } from '@/components/admin-sidebar';
import { ProjectSidebar } from '@/components/project-sidebar';
import { GlobalSidebar } from '@/components/global-sidebar';
import type { ProjectContext } from '@/types/navigation';

/**
 * Top-level sidebar switcher.
 * Renders one of three sidebar variants based on route context:
 *   - /admin/*        → AdminSidebar
 *   - /projects/:id/* → ProjectSidebar
 *   - everywhere else → GlobalSidebar (dashboard + projects list)
 */
export function AppSidebar() {
    const page           = usePage<any>();
    const currentUrl     = (page as any).url as string ?? '';
    const project        = page.props.currentProject as ProjectContext | null | undefined;

    if (currentUrl.startsWith('/admin')) {
        return <AdminSidebar />;
    }

    if (project) {
        return <ProjectSidebar project={project} />;
    }

    return <GlobalSidebar />;
}