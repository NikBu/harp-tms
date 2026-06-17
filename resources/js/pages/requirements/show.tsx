import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrans } from '@/hooks/use-trans';
import { index as projectsIndex } from '@/routes/projects';
import type {
    Requirement,
    RequirementPriority,
    RequirementStatus,
    RequirementType,
} from '@/types/requirement';

const TYPE_BADGE: Record<RequirementType, string> = {
    functional:     'bg-blue-100 text-blue-700 border-blue-200',
    non_functional: 'bg-purple-100 text-purple-700 border-purple-200',
    business:       'bg-orange-100 text-orange-700 border-orange-200',
    constraint:     'bg-slate-100 text-slate-600 border-slate-200',
    user_story:     'bg-teal-100 text-teal-700 border-teal-200',
};

const PRIORITY_BADGE: Record<RequirementPriority, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high:     'bg-orange-100 text-orange-700 border-orange-200',
    medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    low:      'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_BADGE: Record<RequirementStatus, string> = {
    draft:        'bg-slate-100 text-slate-600 border-slate-200',
    under_review: 'bg-blue-100 text-blue-700 border-blue-200',
    approved:     'bg-green-100 text-green-700 border-green-200',
    obsolete:     'bg-gray-100 text-gray-500 border-gray-200',
};

export default function RequirementShow({ requirement }: { requirement: Requirement }) {
    const t = useTrans();

    function deleteReq() {
        if (!window.confirm(t('requirements.actions.delete'))) return;
        router.delete(`/requirements/${requirement.id}`);
    }

    return (
        <>
            <Head title={requirement.title} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">

                <div className="flex items-start justify-between gap-2">
                    <div className="grid gap-1">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">
                                {requirement.display_id}
                            </span>
                            <h1 className="text-2xl font-semibold">{requirement.title}</h1>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {requirement.type && (
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[requirement.type]}`}>
                                    {t(`requirements.types.${requirement.type}`)}
                                </span>
                            )}
                            {requirement.priority && (
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[requirement.priority]}`}>
                                    {t(`requirements.priorities.${requirement.priority}`)}
                                </span>
                            )}
                            {requirement.status && (
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[requirement.status]}`}>
                                    {t(`requirements.statuses.${requirement.status}`)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/requirements/${requirement.id}/edit`}>
                                <Pencil className="size-4" />
                                {t('common.edit')}
                            </Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={deleteReq}>
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                    {requirement.folder && (
                        <span>
                            {t('requirements.fields.folder')}:{' '}
                            <strong className="text-foreground">{requirement.folder.name}</strong>
                        </span>
                    )}
                    {requirement.assignedTo && (
                        <span>
                            {t('requirements.fields.assigned_to')}:{' '}
                            <strong className="text-foreground">{requirement.assignedTo.name}</strong>
                        </span>
                    )}
                    {requirement.external_ref && (
                        <span>
                            {t('requirements.fields.external_ref')}:{' '}
                            <strong className="text-foreground">{requirement.external_ref}</strong>
                        </span>
                    )}
                </div>

                {requirement.tags && requirement.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {requirement.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                    </div>
                )}

                {requirement.description && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('requirements.fields.description')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap text-sm">{requirement.description}</p>
                        </CardContent>
                    </Card>
                )}

                {requirement.test_cases && requirement.test_cases.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('requirements.linked_cases')} ({requirement.test_cases.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            {requirement.test_cases.map((tc) => (
                                <Link
                                    key={tc.id}
                                    href={`/cases/${tc.id}`}
                                    className="text-sm hover:underline"
                                >
                                    {tc.title}
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

RequirementShow.layout = {
    breadcrumbs: [
        { title: 'Projects', href: projectsIndex() },
        { title: 'Requirements' },
    ],
};