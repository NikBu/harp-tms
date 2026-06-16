/**
 * Typed route helpers for the projects resource.
 * Keeps route strings out of page components and easy to refactor.
 */

export function index(): string {
    return '/projects';
}

export function show(projectId: number): string {
    return `/projects/${projectId}`;
}

export function integrations(projectId: number): string {
    return `/projects/${projectId}/integrations`;
}

export function integrationsStore(projectId: number): string {
    return `/projects/${projectId}/integrations`;
}

export function integrationsUpdate(projectId: number, integrationId: number): string {
    return `/projects/${projectId}/integrations/${integrationId}`;
}

export function integrationsDestroy(projectId: number, integrationId: number): string {
    return `/projects/${projectId}/integrations/${integrationId}`;
}

export function integrationsTest(projectId: number, integrationId: number): string {
    return `/projects/${projectId}/integrations/${integrationId}/test`;
}
