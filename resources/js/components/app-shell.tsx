import type { ReactNode } from 'react';
import { AppFooter } from '@/components/app-footer';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

export function AppShell({ children, variant = 'sidebar' }: Props) {
    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">
                {children}
                <AppFooter />
            </div>
        );
    }

    return (
        <div className="flex min-h-svh flex-col">
            {children}
            <AppFooter />
        </div>
    );
}