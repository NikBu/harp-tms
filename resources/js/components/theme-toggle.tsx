import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';

export function ThemeToggle() {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Toggle theme">
                    {!mounted ? (
                        // Neutral placeholder — matches server render, no hydration mismatch
                        <Monitor className="h-4 w-4" />
                    ) : resolvedAppearance === 'dark' ? (
                        <Moon className="h-4 w-4" />
                    ) : (
                        <Sun className="h-4 w-4" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => updateAppearance('light')}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateAppearance('dark')}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateAppearance('system')}>
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
