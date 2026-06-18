import { router, useForm } from '@inertiajs/react';
import {
    GripVertical,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTrans } from '@/hooks/use-trans';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FieldOption {
    id: number;
    option_key: number;
    option_label: string;
    display_order: number;
}

export interface CustomField {
    id: number;
    system_name: string;
    label: string;
    description: string | null;
    field_type: string;
    applies_to: string;
    is_global: boolean;
    options: FieldOption[];
}

interface CustomFieldsPageProps {
    appliesTo: 'cases' | 'results';
    title: string;
    description: string;
    fields: CustomField[];
    fieldTypes: string[];
    storeUrl: string;
    updateUrl: (id: number) => string;
    destroyUrl: (id: number) => string;
}

// ── Field type display helper ─────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<string, string> = {
    string:       'Text (single line)',
    integer:      'Integer',
    text:         'Text (multi-line)',
    rich_text:    'Rich text',
    url:          'URL',
    checkbox:     'Checkbox',
    dropdown:     'Dropdown',
    user:         'User',
    date:         'Date',
    milestone:    'Milestone',
    steps:        'Steps',
    step_results: 'Step Results',
    multi_select: 'Multi-select',
};

const OPTION_TYPES = ['dropdown', 'multi_select'];

// ── Options editor ────────────────────────────────────────────────────────────

interface DraftOption {
    id?: number | null;
    option_label: string;
}

function OptionsEditor({
    options,
    onChange,
}: {
    options: DraftOption[];
    onChange: (opts: DraftOption[]) => void;
}) {
    function add() {
        onChange([...options, { option_label: '' }]);
    }

    function remove(i: number) {
        onChange(options.filter((_, idx) => idx !== i));
    }

    function update(i: number, label: string) {
        onChange(options.map((o, idx) => (idx === i ? { ...o, option_label: label } : o)));
    }

    return (
        <div className="grid gap-2">
            <Label>Options</Label>
            {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                    <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                    <Input
                        value={opt.option_label}
                        onChange={(e) => update(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="h-8"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => remove(i)}
                    >
                        <X className="size-3.5" />
                    </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 w-fit"
                onClick={add}
            >
                <Plus className="size-3.5" />
                Add option
            </Button>
        </div>
    );
}

// ── Field form dialog ─────────────────────────────────────────────────────────

interface FieldFormData {
    system_name: string;
    label: string;
    description: string;
    field_type: string;
    applies_to: string;
    is_global: boolean;
    options: DraftOption[];
}

function FieldDialog({
    open,
    onClose,
    existing,
    appliesTo,
    fieldTypes,
    storeUrl,
    updateUrl,
}: {
    open: boolean;
    onClose: () => void;
    existing: CustomField | null;
    appliesTo: string;
    fieldTypes: string[];
    storeUrl: string;
    updateUrl: (id: number) => string;
}) {
    const t = useTrans();

    const { data, setData, post, patch, processing, errors, reset, clearErrors } =
        useForm<FieldFormData>({
            system_name: existing?.system_name ?? '',
            label:       existing?.label       ?? '',
            description: existing?.description ?? '',
            field_type:  existing?.field_type  ?? 'string',
            applies_to:  appliesTo,
            is_global:   existing?.is_global   ?? false,
            options:     existing?.options.map((o) => ({
                id:           o.id,
                option_label: o.option_label,
            })) ?? [],
        });

    // Keep options in sync when field_type changes away from selectable types
    useEffect(() => {
        if (!OPTION_TYPES.includes(data.field_type)) {
            setData('options', []);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.field_type]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const opts = {
            onSuccess: () => {
                reset();
                onClose();
            },
        };
        if (existing) {
            patch(updateUrl(existing.id), opts);
        } else {
            post(storeUrl, opts);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) { clearErrors(); onClose(); } }}>
            <DialogContent className="max-w-lg">
                <form onSubmit={handleSubmit} className="grid gap-5">
                    <DialogHeader>
                        <DialogTitle>
                            {existing ? 'Edit Field' : 'New Field'}
                        </DialogTitle>
                    </DialogHeader>

                    {/* System name — only on create */}
                    {!existing && (
                        <div className="grid gap-1.5">
                            <Label htmlFor="system_name">
                                System name
                                <span className="ml-1 text-xs text-muted-foreground">(snake_case, immutable after save)</span>
                            </Label>
                            <Input
                                id="system_name"
                                value={data.system_name}
                                onChange={(e) => setData('system_name', e.target.value)}
                                placeholder="e.g. automated_by"
                            />
                            {errors.system_name && (
                                <p className="text-xs text-destructive">{errors.system_name}</p>
                            )}
                        </div>
                    )}

                    {/* Label */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="label">Label</Label>
                        <Input
                            id="label"
                            value={data.label}
                            onChange={(e) => setData('label', e.target.value)}
                            placeholder="e.g. Automated by"
                        />
                        {errors.label && (
                            <p className="text-xs text-destructive">{errors.label}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="description">Description <span className="text-xs text-muted-foreground">(optional)</span></Label>
                        <Input
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Short hint shown below the field"
                        />
                    </div>

                    {/* Field type — only on create */}
                    {!existing && (
                        <div className="grid gap-1.5">
                            <Label>Field type</Label>
                            <Select
                                value={data.field_type}
                                onValueChange={(v) => setData('field_type', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {fieldTypes.map((ft) => (
                                        <SelectItem key={ft} value={ft}>
                                            {FIELD_TYPE_LABELS[ft] ?? ft}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Options editor — only for dropdown / multi_select */}
                    {OPTION_TYPES.includes(data.field_type) && (
                        <OptionsEditor
                            options={data.options}
                            onChange={(opts) => setData('options', opts)}
                        />
                    )}

                    {/* Global toggle */}
                    <label className="flex cursor-pointer items-center gap-3">
                        <input
                            type="checkbox"
                            checked={data.is_global}
                            onChange={(e) => setData('is_global', e.target.checked)}
                            className="size-4 rounded border-input accent-primary"
                        />
                        <span className="text-sm">
                            Global field
                            <span className="ml-1 text-xs text-muted-foreground">(visible in all projects)</span>
                        </span>
                    </label>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ── Main exported page component ──────────────────────────────────────────────

export function CustomFieldsPage({
    appliesTo,
    title,
    description,
    fields,
    fieldTypes,
    storeUrl,
    updateUrl,
    destroyUrl,
}: CustomFieldsPageProps) {
    const t = useTrans();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing]       = useState<CustomField | null>(null);

    function openCreate() {
        setEditing(null);
        setDialogOpen(true);
    }

    function openEdit(field: CustomField) {
        setEditing(field);
        setDialogOpen(true);
    }

    function handleDelete(field: CustomField) {
        if (!window.confirm(t('common.confirm_delete'))) return;
        router.delete(destroyUrl(field.id), { preserveScroll: true });
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">{title}</h1>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Button onClick={openCreate} className="shrink-0">
                    <Plus className="size-4" />
                    New field
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {fields.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                            <p className="text-sm font-medium">No custom fields yet</p>
                            <p className="text-xs text-muted-foreground">
                                Click <strong>New field</strong> to create your first custom field.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="p-3 font-medium">Label</th>
                                    <th className="p-3 font-medium">System name</th>
                                    <th className="p-3 font-medium">Type</th>
                                    <th className="p-3 font-medium">Scope</th>
                                    <th className="p-3 font-medium">Options</th>
                                    <th className="p-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {fields.map((field) => (
                                    <tr
                                        key={field.id}
                                        className="group border-b last:border-0 hover:bg-muted/40"
                                    >
                                        <td className="p-3 font-medium">
                                            {field.label}
                                            {field.description && (
                                                <p className="text-xs font-normal text-muted-foreground">
                                                    {field.description}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono text-xs text-muted-foreground">
                                            {field.system_name}
                                        </td>
                                        <td className="p-3">
                                            <Badge variant="outline" className="text-xs">
                                                {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                                            </Badge>
                                        </td>
                                        <td className="p-3">
                                            {field.is_global ? (
                                                <Badge variant="default" className="text-xs">Global</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs">Per-project</Badge>
                                            )}
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {OPTION_TYPES.includes(field.field_type)
                                                ? `${field.options.length} option${field.options.length !== 1 ? 's' : ''}`
                                                : '—'
                                            }
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                    onClick={() => openEdit(field)}
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                    onClick={() => handleDelete(field)}
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 className="size-3.5 text-destructive" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit dialog */}
            <FieldDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                existing={editing}
                appliesTo={appliesTo}
                fieldTypes={fieldTypes}
                storeUrl={storeUrl}
                updateUrl={updateUrl}
            />
        </div>
    );
}
