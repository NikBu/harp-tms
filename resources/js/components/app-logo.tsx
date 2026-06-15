import { usePage } from '@inertiajs/react';
import { useAppearance } from '@/hooks/use-appearance';

/**
 * Selects the correct logo asset based on active theme and locale.
 *
 * Files expected in /public:
 *   logo-main.png          (EN, light)
 *   logo-main-dark.png     (EN, dark)
 *   logo-main-ru.png       (RU, light)
 *   logo-main-ru-dark.png  (RU, dark)
 */
export function useLogoSrc(): string {
    const { locale } = usePage<{ locale: string }>().props;
    const { resolvedAppearance } = useAppearance();

    const isRu   = locale === 'ru';
    const isDark = resolvedAppearance === 'dark';

    if (isRu && isDark)  return '/logo-main-ru-dark.png';
    if (isRu)            return '/logo-main-ru.png';
    if (isDark)          return '/logo-main-dark.png';
    return '/logo-main.png';
}

export default function AppLogo() {
    const logoSrc = useLogoSrc();

    return (
        <img
            src={logoSrc}
            alt="HARP TMS"
            className="h-8 w-auto object-contain"
        />
    );
}