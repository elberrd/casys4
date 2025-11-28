"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Bold,
  Italic,
  Palette,
  RemoveFormatting,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

const PRESET_COLORS = [
  "#000000",
  "#374151",
  "#6B7280",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#16A34A",
  "#0891B2",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = "",
  className,
  disabled = false,
  error = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable some features we don't need
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      TextStyle,
      Color,
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false, // Avoid SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2",
          "dark:prose-invert",
          "[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
        ),
      },
    },
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Update editable state when disabled changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "border rounded-md bg-background min-h-[180px]",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "border rounded-md bg-background overflow-hidden",
        error && "border-destructive ring-1 ring-destructive",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
        <Button
          type="button"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              title="Text Color"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-6 gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "w-6 h-6 rounded-md border border-border hover:scale-110 transition-transform",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                  }}
                  title={color}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          disabled={disabled}
          title="Clear Formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <div
        className={cn(
          "relative",
          disabled && "pointer-events-none"
        )}
      >
        <EditorContent editor={editor} />
        {!value && placeholder && (
          <div className="absolute top-2 left-3 text-muted-foreground pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Strips HTML tags from rich text content for preview/display purposes
 */
export function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}
