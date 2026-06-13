import { cn } from '@/lib/utils';

interface RichContentProps {
    html: string;
    className?: string;
}

export function RichContent({ html, className }: RichContentProps) {
    return (
        <div
            className={cn(
                'prose prose-sm max-w-none dark:prose-invert',
                className,
            )}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
