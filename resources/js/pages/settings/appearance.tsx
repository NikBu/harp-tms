import { Head } from '@inertiajs/react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useRef } from 'react';
import { Separator } from '@/components/ui/separator';
import Heading from '@/components/heading';
import {
    type Appearance,
    type ChartPaletteId,
    type ColorScheme,
    type FontSize,
    type RadiusSize,
    CHART_PALETTES,
    useAppearance,
} from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-sm font-medium">{title}</h3>
                {description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                )}
            </div>
            {children}
        </div>
    );
}

// ── Theme ──────────────────────────────────────────────────────────────────
const THEMES: { value: Appearance; label: string; icon: React.ElementType }[] = [
    { value: 'light',  label: 'Light',  icon: Sun },
    { value: 'dark',   label: 'Dark',   icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
];

function ThemeSelector() {
    const { appearance, updateAppearance } = useAppearance();
    return (
        <div className="grid grid-cols-3 gap-3">
            {THEMES.map(({ value, label, icon: Icon }) => {
                const active = appearance === value;
                return (
                    <button
                        key={value}
                        onClick={() => updateAppearance(value)}
                        className={cn(
                            'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-sm transition-colors',
                            active
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Color Scheme (UI accent) ───────────────────────────────────────────────
const COLOR_SCHEMES: { value: ColorScheme; label: string; primary: string; accent: string }[] = [
    { value: 'blue',    label: 'Navy',    primary: '#1e3a8a', accent: '#3b82f6' },
    { value: 'slate',   label: 'Slate',   primary: '#475569', accent: '#94a3b8' },
    { value: 'emerald', label: 'Emerald', primary: '#059669', accent: '#34d399' },
    { value: 'rose',    label: 'Rose',    primary: '#e11d48', accent: '#fb7185' },
    { value: 'violet',  label: 'Violet',  primary: '#7c3aed', accent: '#a78bfa' },
];

function ColorSchemeSelector() {
    const { colorScheme, updateColorScheme } = useAppearance();
    return (
        <div className="flex flex-wrap gap-3">
            {COLOR_SCHEMES.map(({ value, label, primary, accent }) => {
                const active = colorScheme === value;
                return (
                    <button
                        key={value}
                        onClick={() => updateColorScheme(value)}
                        title={label}
                        className={cn(
                            'flex items-center gap-2.5 rounded-lg border-2 px-3.5 py-2.5 text-sm transition-colors',
                            active ? 'border-primary' : 'border-border hover:border-primary/40',
                        )}
                    >
                        <span className="flex gap-1">
                            <span className="block h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: primary }} />
                            <span className="block h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: accent }} />
                        </span>
                        <span className={cn('font-medium', active ? 'text-primary' : 'text-foreground')}>
                            {label}
                        </span>
                        {active && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}
                    </button>
                );
            })}
        </div>
    );
}

// ── Chart Theme Picker ─────────────────────────────────────────────────────
const PALETTE_LABELS: Record<ChartPaletteId, string> = {
    default: 'Default',
    fusion:  'Fusion',
    gammel:  'Gammel',
    candy:   'Candy',
    umber:   'Umber',
    custom:  'Custom',
};

function ColorSwatch({ color, editable, index }: { color: string; editable: boolean; index: number }) {
    const { updateCustomChartColor } = useAppearance();
    const inputRef = useRef<HTMLInputElement>(null);

    if (!editable) {
        return (
            <span
                className="block h-7 w-7 rounded border border-black/10"
                style={{ background: color }}
            />
        );
    }

    return (
        <span className="relative block h-7 w-7">
            <span
                className="block h-7 w-7 cursor-pointer rounded border-2 border-border transition-colors hover:border-primary"
                style={{ background: color }}
                onClick={() => inputRef.current?.click()}
                title="Click to change color"
            />
            <input
                ref={inputRef}
                type="color"
                value={color}
                onChange={(e) => updateCustomChartColor(index, e.target.value)}
                className="absolute inset-0 h-0 w-0 cursor-pointer opacity-0"
                aria-label={`Chart color ${index + 1}`}
            />
        </span>
    );
}

function ChartThemePicker() {
    const { chartPalette, customChartColors, updateChartPalette } = useAppearance();

    const rows: ChartPaletteId[] = ['default', 'fusion', 'gammel', 'candy', 'umber', 'custom'];

    return (
        <div className="overflow-hidden rounded-lg border border-border">
            {rows.map((id, rowIdx) => {
                const isActive = chartPalette === id;
                const isCustom = id === 'custom';
                const colors = isCustom ? customChartColors : CHART_PALETTES[id];

                return (
                    <div
                        key={id}
                        onClick={() => updateChartPalette(id)}
                        className={cn(
                            'flex cursor-pointer items-center gap-4 px-4 py-2.5 transition-colors',
                            rowIdx !== 0 && 'border-t border-border',
                            isActive
                                ? 'bg-primary/5'
                                : 'hover:bg-muted/50',
                        )}
                    >
                        {/* Radio indicator */}
                        <span
                            className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                                isActive ? 'border-primary' : 'border-muted-foreground/50',
                            )}
                        >
                            {isActive && (
                                <span className="block h-2 w-2 rounded-full bg-primary" />
                            )}
                        </span>

                        {/* Label */}
                        <span className={cn(
                            'w-16 shrink-0 text-sm font-medium',
                            isActive ? 'text-primary' : 'text-foreground',
                        )}>
                            {PALETTE_LABELS[id]}
                        </span>

                        {/* Swatches */}
                        <div
                            className="flex gap-1"
                            onClick={(e) => isCustom && e.stopPropagation()}
                        >
                            {colors.map((color, i) => (
                                <ColorSwatch
                                    key={i}
                                    color={color}
                                    editable={isCustom && isActive}
                                    index={i}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Font Size ──────────────────────────────────────────────────────────────
const FONT_SIZES: { value: FontSize; label: string; description: string }[] = [
    { value: 'sm', label: 'Small',   description: '14px' },
    { value: 'md', label: 'Default', description: '16px' },
    { value: 'lg', label: 'Large',   description: '18px' },
];

function FontSizeSelector() {
    const { fontSize, updateFontSize } = useAppearance();
    return (
        <div className="grid grid-cols-3 gap-3">
            {FONT_SIZES.map(({ value, label, description }) => {
                const active = fontSize === value;
                return (
                    <button
                        key={value}
                        onClick={() => updateFontSize(value)}
                        className={cn(
                            'flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors',
                            active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                        )}
                    >
                        <span className={cn('font-semibold leading-none',
                            value === 'sm' && 'text-sm',
                            value === 'md' && 'text-base',
                            value === 'lg' && 'text-lg',
                        )}>Aa</span>
                        <span className={cn('text-xs font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                            {label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{description}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Border Radius ──────────────────────────────────────────────────────────
const RADIUS_OPTIONS: { value: RadiusSize; label: string; style: string }[] = [
    { value: 'none', label: 'Square',  style: 'rounded-none' },
    { value: 'sm',   label: 'Subtle',  style: 'rounded-sm' },
    { value: 'md',   label: 'Default', style: 'rounded-md' },
    { value: 'lg',   label: 'Rounded', style: 'rounded-xl' },
];

function RadiusSelector() {
    const { radius, updateRadius } = useAppearance();
    return (
        <div className="grid grid-cols-4 gap-3">
            {RADIUS_OPTIONS.map(({ value, label, style }) => {
                const active = radius === value;
                return (
                    <button
                        key={value}
                        onClick={() => updateRadius(value)}
                        className={cn(
                            'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                            active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                        )}
                    >
                        <span className={cn('block h-8 w-8 border-2', style,
                            active ? 'border-primary bg-primary/10' : 'border-muted-foreground/40',
                        )} />
                        <span className={cn('text-xs font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                            {label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function Appearance() {
    return (
        <>
            <Head title="Appearance settings" />
            <h1 className="sr-only">Appearance settings</h1>

            <div className="space-y-8">
                <Heading
                    variant="small"
                    title="Appearance"
                    description="Customize how the application looks and feels for you. These settings are saved locally in your browser."
                />

                <Separator />

                <Section title="Theme" description="Choose between light, dark, or follow your system preference.">
                    <ThemeSelector />
                </Section>

                <Separator />

                <Section title="Color scheme" description="Select an accent color used for buttons, links, and active states.">
                    <ColorSchemeSelector />
                </Section>

                <Separator />

                <Section
                    title="Chart theme"
                    description="Choose a color palette for charts and reports. Select Custom to pick your own colors."
                >
                    <ChartThemePicker />
                </Section>

                <Separator />

                <Section title="Font size" description="Adjust the base font size used across the application.">
                    <FontSizeSelector />
                </Section>

                <Separator />

                <Section title="Corner radius" description="Control how rounded UI elements appear.">
                    <RadiusSelector />
                </Section>
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: editAppearance(),
        },
    ],
};
