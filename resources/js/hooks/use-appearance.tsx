import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';
export type ColorScheme = 'blue' | 'slate' | 'emerald' | 'rose' | 'violet';
export type FontSize = 'sm' | 'md' | 'lg';
export type RadiusSize = 'none' | 'sm' | 'md' | 'lg';
export type ChartPaletteId = 'default' | 'fusion' | 'gammel' | 'candy' | 'umber' | 'custom';

// 8-color palettes for chart series
export const CHART_PALETTES: Record<Exclude<ChartPaletteId, 'custom'>, string[]> = {
    default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
    fusion:  ['#7c6fcd', '#3cbfae', '#f4845f', '#f0d05f', '#a78bc9', '#72d4c4', '#f9a07a', '#f5e07a'],
    gammel:  ['#7eb5d5', '#808080', '#78d97a', '#e8a05f', '#f0919a', '#d4c85a', '#f07878', '#c8a0e0'],
    candy:   ['#22d3ee', '#f9d74c', '#f472b6', '#4ade80', '#f97316', '#fde68a', '#d8b4fe', '#f87171'],
    umber:   ['#1e3a5f', '#c0392b', '#e67e22', '#808080', '#f0a0a0', '#2ecc71', '#a0a0a0', '#e74c3c'],
};

export const DEFAULT_CUSTOM_COLORS: string[] = [
    '#6ee7b7', '#6366f1', '#fbbf24', '#f87171',
    '#34d399', '#a78bfa', '#60a5fa', '#fb923c',
];

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
    readonly chartPalette: ChartPaletteId;
    readonly chartColors: string[];
    readonly customChartColors: string[];
    readonly updateChartPalette: (id: ChartPaletteId) => void;
    readonly updateCustomChartColor: (index: number, color: string) => void;
};

// ── Module-level state (single source of truth) ──────────────────────────
const listeners = new Set<() => void>();

let currentAppearance: Appearance = 'system';
let currentColorScheme: ColorScheme = 'blue';
let currentFontSize: FontSize = 'md';
let currentRadius: RadiusSize = 'md';
let currentChartPalette: ChartPaletteId = 'default';
let currentCustomChartColors: string[] = DEFAULT_CUSTOM_COLORS;

// ── Helpers ───────────────────────────────────────────────────────────────
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

const FONT_SIZE_MAP: Record<FontSize, string> = { sm: '14px', md: '16px', lg: '18px' };

const applyFontSize = (size: FontSize): void => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--font-size', FONT_SIZE_MAP[size]);
};

const RADIUS_MAP: Record<RadiusSize, string> = {
    none: '0rem', sm: '0.25rem', md: '0.5rem', lg: '0.75rem',
};

const applyRadius = (radius: RadiusSize): void => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--radius', RADIUS_MAP[radius]);
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

// ── Initialization (called in app.tsx before React mounts) ────────────────
export function initializeTheme(): void {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem('appearance')) {
        localStorage.setItem('appearance', 'system');
        setCookie('appearance', 'system');
    }
    currentAppearance = getStored<Appearance>('appearance', 'system');
    applyTheme(currentAppearance);
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);

    currentColorScheme = getStored<ColorScheme>('color-scheme', 'blue');
    applyColorScheme(currentColorScheme);

    currentFontSize = getStored<FontSize>('font-size', 'md');
    applyFontSize(currentFontSize);

    currentRadius = getStored<RadiusSize>('radius', 'md');
    applyRadius(currentRadius);

    currentChartPalette = getStored<ChartPaletteId>('chart-palette', 'default');
    const storedCustom = localStorage.getItem('chart-custom-colors');
    if (storedCustom) {
        try { currentCustomChartColors = JSON.parse(storedCustom); } catch { /* ignore */ }
    }
}

// ── Stable server snapshots (must return the same reference every call) ───
// React calls getServerSnapshot multiple times to detect tearing; returning
// a new array instance each call triggers the "should be cached" warning.
const serverSnapshotAppearance    = (): Appearance      => 'system';
const serverSnapshotColorScheme   = (): ColorScheme     => 'blue';
const serverSnapshotFontSize      = (): FontSize        => 'md';
const serverSnapshotRadius        = (): RadiusSize      => 'md';
const serverSnapshotChartPalette  = (): ChartPaletteId  => 'default';
const serverSnapshotCustomColors  = (): string[]        => DEFAULT_CUSTOM_COLORS; // stable module-level ref

// ── Hook ──────────────────────────────────────────────────────────────────
export function useAppearance(): UseAppearanceReturn {
    const appearance = useSyncExternalStore(
        subscribe, () => currentAppearance, serverSnapshotAppearance,
    );
    const colorScheme = useSyncExternalStore(
        subscribe, () => currentColorScheme, serverSnapshotColorScheme,
    );
    const fontSize = useSyncExternalStore(
        subscribe, () => currentFontSize, serverSnapshotFontSize,
    );
    const radius = useSyncExternalStore(
        subscribe, () => currentRadius, serverSnapshotRadius,
    );
    const chartPalette = useSyncExternalStore(
        subscribe, () => currentChartPalette, serverSnapshotChartPalette,
    );
    const customChartColors = useSyncExternalStore(
        subscribe, () => currentCustomChartColors, serverSnapshotCustomColors,
    );

    const resolvedAppearance: ResolvedAppearance = isDarkMode(appearance) ? 'dark' : 'light';

    const chartColors =
        chartPalette === 'custom'
            ? customChartColors
            : CHART_PALETTES[chartPalette];

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

    const updateChartPalette = (id: ChartPaletteId): void => {
        currentChartPalette = id;
        localStorage.setItem('chart-palette', id);
        notify();
    };

    const updateCustomChartColor = (index: number, color: string): void => {
        const next = [...currentCustomChartColors];
        next[index] = color;
        currentCustomChartColors = next;
        localStorage.setItem('chart-custom-colors', JSON.stringify(next));
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
        chartPalette,
        chartColors,
        customChartColors,
        updateChartPalette,
        updateCustomChartColor,
    } as const;
}
