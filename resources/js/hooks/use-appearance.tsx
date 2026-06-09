import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';
export type ColorScheme = 'blue' | 'slate' | 'emerald' | 'rose' | 'violet';
export type FontSize = 'sm' | 'md' | 'lg';
export type RadiusSize = 'none' | 'sm' | 'md' | 'lg';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
    readonly colorScheme: ColorScheme;
    readonly updateColorScheme: (scheme: ColorScheme) => void;
    readonly fontSize: FontSize;
    readonly updateFontSize: (size: FontSize) => void;
    readonly radius: RadiusSize;
    readonly updateRadius: (radius: RadiusSize) => void;
};

const listeners = new Set<() => void>();

let currentAppearance: Appearance = 'system';
let currentColorScheme: ColorScheme = 'blue';
let currentFontSize: FontSize = 'md';
let currentRadius: RadiusSize = 'md';

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') return;
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStored = <T extends string>(key: string, fallback: T): T =>
    typeof window !== 'undefined'
        ? ((localStorage.getItem(key) as T) ?? fallback)
        : fallback;

const isDarkMode = (appearance: Appearance): boolean =>
    appearance === 'dark' || (appearance === 'system' && prefersDark());

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === 'undefined') return;
    const isDark = isDarkMode(appearance);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const applyColorScheme = (scheme: ColorScheme): void => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-color-scheme', scheme);
};

const FONT_SIZES: Record<FontSize, string> = {
    sm: '14px',
    md: '16px',
    lg: '18px',
};

const applyFontSize = (size: FontSize): void => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--font-size', FONT_SIZES[size]);
};

const RADIUS_VALUES: Record<RadiusSize, string> = {
    none: '0rem',
    sm:   '0.25rem',
    md:   '0.5rem',
    lg:   '0.75rem',
};

const applyRadius = (radius: RadiusSize): void => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--radius', RADIUS_VALUES[radius]);
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((l) => l());

const mediaQuery = (): MediaQueryList | null =>
    typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

const handleSystemThemeChange = (): void => applyTheme(currentAppearance);

export function initializeTheme(): void {
    if (typeof window === 'undefined') return;

    // Appearance (light/dark/system)
    if (!localStorage.getItem('appearance')) {
        localStorage.setItem('appearance', 'system');
        setCookie('appearance', 'system');
    }
    currentAppearance = getStored<Appearance>('appearance', 'system');
    applyTheme(currentAppearance);
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);

    // Color scheme
    currentColorScheme = getStored<ColorScheme>('color-scheme', 'blue');
    applyColorScheme(currentColorScheme);

    // Font size
    currentFontSize = getStored<FontSize>('font-size', 'md');
    applyFontSize(currentFontSize);

    // Radius
    currentRadius = getStored<RadiusSize>('radius', 'md');
    applyRadius(currentRadius);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'system' as Appearance,
    );

    const colorScheme = useSyncExternalStore(
        subscribe,
        () => currentColorScheme,
        () => 'blue' as ColorScheme,
    );

    const fontSize = useSyncExternalStore(
        subscribe,
        () => currentFontSize,
        () => 'md' as FontSize,
    );

    const radius = useSyncExternalStore(
        subscribe,
        () => currentRadius,
        () => 'md' as RadiusSize,
    );

    const resolvedAppearance: ResolvedAppearance = isDarkMode(appearance) ? 'dark' : 'light';

    const updateAppearance = (mode: Appearance): void => {
        currentAppearance = mode;
        localStorage.setItem('appearance', mode);
        setCookie('appearance', mode);
        applyTheme(mode);
        notify();
    };

    const updateColorScheme = (scheme: ColorScheme): void => {
        currentColorScheme = scheme;
        localStorage.setItem('color-scheme', scheme);
        applyColorScheme(scheme);
        notify();
    };

    const updateFontSize = (size: FontSize): void => {
        currentFontSize = size;
        localStorage.setItem('font-size', size);
        applyFontSize(size);
        notify();
    };

    const updateRadius = (r: RadiusSize): void => {
        currentRadius = r;
        localStorage.setItem('radius', r);
        applyRadius(r);
        notify();
    };

    return {
        appearance,
        resolvedAppearance,
        updateAppearance,
        colorScheme,
        updateColorScheme,
        fontSize,
        updateFontSize,
        radius,
        updateRadius,
    } as const;
}
