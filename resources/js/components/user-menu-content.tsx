import { Link, router, usePage } from '@inertiajs/react';
import { Check, Globe, LogOut, Settings } from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { cn } from '@/lib/utils';
import { useTrans } from '@/hooks/use-trans';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

const LOCALES = [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
] as const;

export function UserMenuContent({ user }: Props) {
    const cleanup     = useMobileNavigation();
    const t           = useTrans();
    const page        = usePage<any>();
    const currentLocale = (page.props as any).locale as string ?? 'en';

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    const switchLocale = (locale: string) => {
        if (locale === currentLocale) return;
        router.post(
            '/locale',
            { locale },
            { preserveState: false, preserveScroll: false },
        );
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        {t('app.common.settings')}
                    </Link>
                </DropdownMenuItem>

                {/* Language switcher */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Globe className="mr-2 h-4 w-4" />
                        <span>{t('app.common.language')}</span>
                        <span className="ml-auto text-xs uppercase text-muted-foreground">
                            {currentLocale}
                        </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {LOCALES.map(({ code, label }) => (
                            <DropdownMenuItem
                                key={code}
                                onClick={() => switchLocale(code)}
                                className={currentLocale === code ? 'font-medium' : ''}
                            >
                                <Check
                                    className={cn(
                                        'mr-2 h-4 w-4 text-primary',
                                        currentLocale === code ? 'opacity-100' : 'opacity-0',
                                    )}
                                />
                                {label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    {t('app.common.logout')}
                </Link>
            </DropdownMenuItem>
        </>
    );
}
