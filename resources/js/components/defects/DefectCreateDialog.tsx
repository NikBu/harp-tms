import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Integration {
    id: number;
    provider: string;
    name?: string;
}

interface Props {
    integrations: Integration[];
    resultId: number;
    prefillTitle?: string;
    prefillDescription?: string;
    onCreated?: () => void;
    disabled?: boolean;
}

const PRIORITIES = ['critical', 'high', 'medium', 'low'];

export function DefectCreateDialog({
    integrations,
    resultId,
    prefillTitle = '',
    prefillDescription = '',
    onCreated,
    disabled = false,
}: Props) {
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        integration_id: integrations[0]?.id ?? 0,
        title: prefillTitle,
        description: prefillDescription,
        priority: 'medium' as string,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(route('defects.create-in-tracker', { result: resultId }), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setOpen(false);
                onCreated?.();
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={disabled}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create defect
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create defect in tracker</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {integrations.length > 1 && (
                        <div className="space-y-1.5">
                            <Label htmlFor="integration">Tracker</Label>
                            <Select
                                value={String(data.integration_id)}
                                onValueChange={(v) => setData('integration_id', Number(v))}
                            >
                                <SelectTrigger id="integration">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {integrations.map((i) => (
                                        <SelectItem key={i.id} value={String(i.id)}>
                                            {i.name ?? i.provider}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="defect-title">Title</Label>
                        <Input
                            id="defect-title"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder="Short description of the defect"
                            required
                        />
                        {errors.title && <p className="text-error text-xs">{errors.title}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="defect-description">
                            Description{' '}
                            <span className="text-text-muted text-xs">(optional)</span>
                        </Label>
                        <Textarea
                            id="defect-description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={4}
                            placeholder="Steps to reproduce, expected vs actual..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="defect-priority">Priority</Label>
                        <Select
                            value={data.priority}
                            onValueChange={(v) => setData('priority', v)}
                        >
                            <SelectTrigger id="defect-priority">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRIORITIES.map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating…' : 'Create & link'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
