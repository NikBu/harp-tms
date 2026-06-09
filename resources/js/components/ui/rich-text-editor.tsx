import { MinimalTiptapEditor } from '@/components/minimal-tiptap';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    editorClassName?: string;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder,
    className,
    editorClassName,
}: RichTextEditorProps) {
    return (
        <MinimalTiptapEditor
            value={value}
            onValueChange={onChange}
            placeholder={placeholder}
            className={className}
            editorContentClassName={editorClassName}
            output="html"
            autofocus={false}
            editable={true}
            editorClassName="focus:outline-none min-h-[100px] px-3 py-2"
        />
    );
}
