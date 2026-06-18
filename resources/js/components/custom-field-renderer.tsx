import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { CustomField } from '@/types/custom-field';

interface Props {
    field: CustomField;
    value: unknown;
    onChange: (fieldId: number, value: unknown) => void;
    error?: string;
}

export function CustomFieldRenderer({ field, value, onChange, error }: Props) {
    const inputClass =
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

    function set(val: unknown) {
        onChange(field.id, val);
    }

    const strVal = (value ?? '') as string;
    const numVal = value !== undefined && value !== '' ? Number(value) : undefined;
    const boolVal = !!value;

    return (
        <div className="grid gap-2">
            <Label>
                {field.label}
                {field.is_required && <span className="ml-0.5 text-destructive">*</span>}
            </Label>

            {field.field_type === 'string' && (
                <Input value={strVal} onChange={(e) => set(e.target.value)} />
            )}

            {field.field_type === 'url' && (
                <Input type="url" value={strVal} onChange={(e) => set(e.target.value)} placeholder="https://" />
            )}

            {field.field_type === 'integer' && (
                <Input
                    type="number"
                    value={numVal ?? ''}
                    onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
                />
            )}

            {field.field_type === 'text' && (
                <textarea
                    value={strVal}
                    onChange={(e) => set(e.target.value)}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
            )}

            {field.field_type === 'rich_text' && (
                <RichTextEditor value={strVal} onChange={(v) => set(v)} />
            )}

            {field.field_type === 'checkbox' && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={boolVal}
                        onChange={(e) => set(e.target.checked)}
                        className="size-4 rounded border-input accent-primary"
                    />
                    {field.description ?? field.label}
                </label>
            )}

            {field.field_type === 'date' && (
                <Input
                    type="date"
                    value={strVal}
                    onChange={(e) => set(e.target.value)}
                />
            )}

            {(field.field_type === 'dropdown' || field.field_type === 'user' || field.field_type === 'milestone') && (
                <Select
                    value={strVal || '__none__'}
                    onValueChange={(v) => set(v === '__none__' ? '' : v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {(field.options ?? []).map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.id)}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {field.field_type === 'multi_select' && (
                <div className="flex flex-wrap gap-2">
                    {(field.options ?? []).map((opt) => {
                        const selected = Array.isArray(value)
                            ? (value as string[]).includes(String(opt.id))
                            : false;
                        return (
                            <label key={opt.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => {
                                        const current = Array.isArray(value)
                                            ? (value as string[])
                                            : [];
                                        const id = String(opt.id);
                                        set(
                                            selected
                                                ? current.filter((v) => v !== id)
                                                : [...current, id],
                                        );
                                    }}
                                    className="size-4 rounded border-input accent-primary"
                                />
                                {opt.label}
                            </label>
                        );
                    })}
                </div>
            )}

            {field.description && field.field_type !== 'checkbox' && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
