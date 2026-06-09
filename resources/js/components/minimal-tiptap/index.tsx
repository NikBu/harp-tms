import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { TextStyle } from '@tiptap/extension-text-style';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Code,
    Heading1,
    Heading2,
    Image as ImageIcon,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Minus,
    Quote,
    Redo,
    Strikethrough,
    Table as TableIcon,
    Underline as UnderlineIcon,
    Undo,
} from 'lucide-react';
import { useEffect } from 'react';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

export interface MinimalTiptapEditorProps {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    editorContentClassName?: string;
    editorClassName?: string;
    output?: 'html' | 'json' | 'text';
    autofocus?: boolean;
    editable?: boolean;
}

function ToolbarButton({
    onClick,
    active,
    disabled,
    label,
    children,
}: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <Toggle
            size="sm"
            pressed={active}
            disabled={disabled}
            title={label}
            aria-label={label}
            onPressedChange={onClick}
            onMouseDown={(e) => e.preventDefault()}
        >
            {children}
        </Toggle>
    );
}

function Toolbar({ editor }: { editor: Editor }) {
    function promptLink() {
        const previous = editor.getAttributes('link').href as
            | string
            | undefined;
        const url = window.prompt('URL', previous ?? 'https://');

        if (url === null) {
            return;
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url })
            .run();
    }

    function promptImage() {
        const url = window.prompt('Image URL', 'https://');

        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-input p-1">
            <ToolbarButton
                label="Bold"
                active={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Italic"
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Underline"
                active={editor.isActive('underline')}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
                <UnderlineIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Strikethrough"
                active={editor.isActive('strike')}
                onClick={() => editor.chain().focus().toggleStrike().run()}
            >
                <Strikethrough className="size-4" />
            </ToolbarButton>

            <span className="mx-1 h-5 w-px bg-border" />

            <ToolbarButton
                label="Heading 1"
                active={editor.isActive('heading', { level: 1 })}
                onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
            >
                <Heading1 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Heading 2"
                active={editor.isActive('heading', { level: 2 })}
                onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
            >
                <Heading2 className="size-4" />
            </ToolbarButton>

            <span className="mx-1 h-5 w-px bg-border" />

            <ToolbarButton
                label="Bullet List"
                active={editor.isActive('bulletList')}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Ordered List"
                active={editor.isActive('orderedList')}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <ListOrdered className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Blockquote"
                active={editor.isActive('blockquote')}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
                <Quote className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Code Block"
                active={editor.isActive('codeBlock')}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
                <Code className="size-4" />
            </ToolbarButton>

            <span className="mx-1 h-5 w-px bg-border" />

            <ToolbarButton
                label="Link"
                active={editor.isActive('link')}
                onClick={promptLink}
            >
                <LinkIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Image" onClick={promptImage}>
                <ImageIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Table"
                onClick={() =>
                    editor
                        .chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run()
                }
            >
                <TableIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Horizontal Rule"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
                <Minus className="size-4" />
            </ToolbarButton>

            <span className="mx-1 h-5 w-px bg-border" />

            <ToolbarButton
                label="Undo"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
            >
                <Undo className="size-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Redo"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
            >
                <Redo className="size-4" />
            </ToolbarButton>
        </div>
    );
}

export function MinimalTiptapEditor({
    value,
    onValueChange,
    placeholder,
    className,
    editorContentClassName,
    editorClassName = 'focus:outline-none min-h-[100px] px-3 py-2',
    autofocus = false,
    editable = true,
}: MinimalTiptapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                link: { openOnClick: false, autolink: true },
            }),
            TextStyle,
            Image,
            TableKit,
        ],
        content: value,
        editable,
        autofocus,
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-sm max-w-none dark:prose-invert',
                    editorClassName,
                ),
                ...(placeholder ? { 'data-placeholder': placeholder } : {}),
            },
        },
        onUpdate: ({ editor: instance }) => {
            const html = instance.getHTML();
            onValueChange(html === '<p></p>' ? '' : html);
        },
    });

    // Keep the editor content in sync when the bound value is replaced externally
    // (e.g. form reset). Avoid clobbering the user's caret on every keystroke.
    useEffect(() => {
        if (!editor) {
            return;
        }

        const current = editor.getHTML();
        const next = value || '';

        if (
            next !== current &&
            next !== (current === '<p></p>' ? '' : current)
        ) {
            editor.commands.setContent(next, { emitUpdate: false });
        }
    }, [editor, value]);

    if (!editor) {
        return null;
    }

    return (
        <div
            className={cn(
                'rounded-md border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
                className,
            )}
        >
            <Toolbar editor={editor} />
            <EditorContent editor={editor} className={editorContentClassName} />
        </div>
    );
}
