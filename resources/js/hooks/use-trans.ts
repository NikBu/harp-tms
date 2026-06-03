// resources/js/hooks/use-trans.ts
import { usePage } from '@inertiajs/react';

type Translations = Record<string, Record<string, string | Record<string, string>>>;

export function useTrans() {
    const { translations } = usePage<{ translations: Translations }>().props;

    return function t(key: string, replacements?: Record<string, string>): string {
        // key format: "app.common.save" or "app.navigation.projects"
        const parts = key.split('.');
        let result: unknown = translations;

        for (const part of parts) {
            if (typeof result === 'object' && result !== null) {
                result = (result as Record<string, unknown>)[part];
            } else {
                return key; // fallback: return the key itself if missing
            }
        }

        if (typeof result !== 'string') return key;

        // Handle :placeholder replacements
        if (replacements) {
            return Object.entries(replacements).reduce(
                (str, [k, v]) => str.replace(`:${k}`, v),
                result
            );
        }
        return result;
    };
}