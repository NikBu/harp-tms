import { useEffect, useState } from 'react';
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
 *
 * The `mounted` guard prevents a React hydration mismatch: the server
 * always renders the light variant (theme is unknown at SSR time), and
 * we switch to the correct variant only after the client has mounted and
 * read the theme from localStorage.
 */
export function useLogoSrc(): string {
    const { locale } = usePage<{ locale: string }>().props;
    const { resolvedAppearance } = useAppearance();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Before mount: return the light variant so server HTML == initial client render
    if (!mounted) {
        return locale === 'ru' ? '/logo-main-ru.png' : '/logo-main.png';
    }

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
