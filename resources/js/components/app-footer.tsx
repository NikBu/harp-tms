import { useTrans } from '@/hooks/use-trans';

export function AppFooter() {
    const t = useTrans();

    return (
        <footer className="mt-auto border-t border-sidebar-border/50 bg-background px-6 py-3">
            <p className="text-center text-xs text-muted-foreground">
                {t('app.footer.diploma_note')}
                {' · '}
                <span className="font-medium">{t('app.footer.author')}</span>
            </p>
        </footer>
    );
}