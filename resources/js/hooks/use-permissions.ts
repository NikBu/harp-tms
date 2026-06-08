import { usePage } from '@inertiajs/react';

/**
 * Derives simple permission booleans from auth.user.roles (array of strings)
 * shared via HandleInertiaRequests. Falls back gracefully when roles are absent.
 */
export function usePermissions() {
    const { auth } = usePage<any>().props;
    const roles: string[] = (auth?.user as any)?.roles ?? [];

    const isSiteAdmin    = roles.includes('admin');
    const isProjectAdmin = isSiteAdmin || roles.includes('project_admin');
    const isLead         = isProjectAdmin || roles.includes('lead') || roles.includes('editor');
    const canAdd         = isLead;

    return { isSiteAdmin, isProjectAdmin, isLead, canAdd };
}