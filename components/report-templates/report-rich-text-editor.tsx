"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useEditor,
  useEditorState,
  EditorContent,
  type Editor,
} from "@tiptap/react";
import {
  ReportVariable,
  isReportVariableFormatActive,
  type ReportVariableFormatAttr,
} from "@/components/report-templates/report-variable-extension";
import { ReportEnterToLineBreak } from "@/components/report-templates/report-enter-extension";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontSize, Color, LineHeight } from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ReportPageCanvas } from "@/components/report-templates/report-page-canvas";
import { ReportPageGap } from "@/components/report-templates/report-page-gap-extension";
import type { ReportVariableGroupId, ReportVariableKey } from "@/lib/report-templates/variables";
import {
  REPORT_CONTENT_HEIGHT_MM,
  reportDocumentCss,
} from "@/lib/report-templates/page-layout";

const PRESET_COLORS = [
  "#111827",
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

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const LINE_HEIGHTS = ["1.15", "1.5", "1.75", "2"];

export interface ReportEditorVariableGroup {
  id: ReportVariableGroupId;
  label: string;
  variables: Array<{ key: ReportVariableKey; label: string }>;
}

interface ReportRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  enableVariables?: boolean;
  variableGroups?: ReportEditorVariableGroup[];
  getVariableLabel?: (key: string) => string;
  variablesLabel?: string;
  variablesSearchPlaceholder?: string;
  noVariablesFoundLabel?: string;
}

function toggleInlineFormat(editor: Editor, attr: ReportVariableFormatAttr) {
  if (editor.commands.toggleReportVariableFormat(attr)) {
    return;
  }
  const chain = editor.chain();
  if (attr === "bold") {
    chain.toggleBold().run();
    return;
  }
  if (attr === "italic") {
    chain.toggleItalic().run();
    return;
  }
  if (attr === "underline") {
    chain.toggleUnderline().run();
    return;
  }
  chain.toggleStrike().run();
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );
}

function EditorToolbar({
  editor,
  disabled,
  enableVariables,
  variableGroups,
  variablesLabel,
  variablesSearchPlaceholder,
  noVariablesFoundLabel,
}: {
  editor: Editor;
  disabled: boolean;
  enableVariables: boolean;
  variableGroups: ReportEditorVariableGroup[];
  variablesLabel: string;
  variablesSearchPlaceholder: string;
  noVariablesFoundLabel: string;
}) {
  const t = useTranslations("ReportTemplates");
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      heading1: current.isActive("heading", { level: 1 }),
      heading2: current.isActive("heading", { level: 2 }),
      heading3: current.isActive("heading", { level: 3 }),
      bold: isReportVariableFormatActive(current, "bold"),
      italic: isReportVariableFormatActive(current, "italic"),
      underline: isReportVariableFormatActive(current, "underline"),
      strike: isReportVariableFormatActive(current, "strike"),
      subscript: current.isActive("subscript"),
      superscript: current.isActive("superscript"),
      fontSize: (current.getAttributes("textStyle").fontSize as string | undefined) ?? "",
      lineHeight:
        (current.getAttributes("textStyle").lineHeight as string | undefined) ?? "",
      alignLeft: current.isActive({ textAlign: "left" }),
      alignCenter: current.isActive({ textAlign: "center" }),
      alignRight: current.isActive({ textAlign: "right" }),
      justify: current.isActive({ textAlign: "justify" }),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      blockquote: current.isActive("blockquote"),
    }),
  });
  const [variableQuery, setVariableQuery] = useState("");
  const normalizedQuery = variableQuery.trim().toLowerCase();
  const filteredGroups = variableGroups
    .map((group) => ({
      ...group,
      variables: group.variables.filter((variable) =>
        normalizedQuery
          ? variable.label.toLowerCase().includes(normalizedQuery)
          : true,
      ),
    }))
    .filter((group) => group.variables.length > 0);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-2">
      <ToolbarButton
        disabled={disabled}
        title={t("toolbar.undo")}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        title={t("toolbar.redo")}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        active={toolbarState.heading1}
        disabled={disabled}
        title={t("toolbar.heading1")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.heading2}
        disabled={disabled}
        title={t("toolbar.heading2")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.heading3}
        disabled={disabled}
        title={t("toolbar.heading3")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        active={toolbarState.bold}
        disabled={disabled}
        title={t("toolbar.bold")}
        onClick={() => toggleInlineFormat(editor, "bold")}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.italic}
        disabled={disabled}
        title={t("toolbar.italic")}
        onClick={() => toggleInlineFormat(editor, "italic")}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.underline}
        disabled={disabled}
        title={t("toolbar.underline")}
        onClick={() => toggleInlineFormat(editor, "underline")}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.strike}
        disabled={disabled}
        title={t("toolbar.strikethrough")}
        onClick={() => toggleInlineFormat(editor, "strike")}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.subscript}
        disabled={disabled}
        title={t("toolbar.subscript")}
        onClick={() => editor.chain().toggleSubscript().run()}
      >
        <SubscriptIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.superscript}
        disabled={disabled}
        title={t("toolbar.superscript")}
        onClick={() => editor.chain().toggleSuperscript().run()}
      >
        <SuperscriptIcon className="h-4 w-4" />
      </ToolbarButton>
      <select
        className="h-8 rounded-md border bg-background px-2 text-xs"
        disabled={disabled}
        value={toolbarState.fontSize}
        onChange={(event) => {
          const size = event.target.value;
          if (!size) {
            editor.chain().unsetFontSize().run();
            return;
          }
          editor.chain().setFontSize(size).run();
        }}
        aria-label={t("toolbar.fontSize")}
      >
        <option value="">16px</option>
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <select
        className="h-8 rounded-md border bg-background px-2 text-xs"
        disabled={disabled}
        value={toolbarState.lineHeight}
        onChange={(event) => {
          const lineHeight = event.target.value;
          if (!lineHeight) {
            editor.chain().unsetLineHeight().run();
            return;
          }
          editor.chain().setLineHeight(lineHeight).run();
        }}
        aria-label={t("toolbar.lineHeight")}
      >
        <option value="">1.5</option>
        {LINE_HEIGHTS.map((lineHeight) => (
          <option key={lineHeight} value={lineHeight}>
            {lineHeight}
          </option>
        ))}
      </select>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} title={t("toolbar.textColor")} onMouseDown={(event) => event.preventDefault()}>
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-6 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="h-6 w-6 rounded-md border border-border transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor.chain().setColor(color).run()}
                title={color}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} title={t("toolbar.highlight")} onMouseDown={(event) => event.preventDefault()}>
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-6 gap-1">
            {["#FEF3C7", "#FDE68A", "#BBF7D0", "#BAE6FD", "#E9D5FF", "#FECACA"].map(
              (color) => (
                <button
                  key={color}
                  type="button"
                  className="h-6 w-6 rounded-md border border-border transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    editor.chain().toggleHighlight({ color }).run()
                  }
                  title={color}
                />
              ),
            )}
          </div>
        </PopoverContent>
      </Popover>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        active={toolbarState.alignLeft}
        disabled={disabled}
        title={t("toolbar.alignLeft")}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.alignCenter}
        disabled={disabled}
        title={t("toolbar.alignCenter")}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.alignRight}
        disabled={disabled}
        title={t("toolbar.alignRight")}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.justify}
        disabled={disabled}
        title={t("toolbar.justify")}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        active={toolbarState.bulletList}
        disabled={disabled}
        title={t("toolbar.bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.orderedList}
        disabled={disabled}
        title={t("toolbar.numberedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={toolbarState.blockquote}
        disabled={disabled}
        title={t("toolbar.quote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        title={t("toolbar.horizontalRule")}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        title={t("toolbar.insertTable")}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        title={t("toolbar.clearFormatting")}
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
      >
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>
      {enableVariables && (
        <>
          <div className="mx-1 h-4 w-px bg-border" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                className="h-8 gap-1.5"
              >
                <Braces className="h-4 w-4" />
                {variablesLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="border-b p-2">
                <Input
                  value={variableQuery}
                  onChange={(event) => setVariableQuery(event.target.value)}
                  placeholder={variablesSearchPlaceholder}
                />
              </div>
              <ScrollArea className="h-72">
                <div className="p-2">
                  {filteredGroups.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                      {noVariablesFoundLabel}
                    </p>
                  ) : (
                    filteredGroups.map((group) => (
                      <div key={group.id} className="mb-3">
                        <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {group.label}
                        </p>
                        <div className="flex flex-col">
                          {group.variables.map((variable) => (
                            <button
                              key={variable.key}
                              type="button"
                              className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                              onClick={() => {
                                editor
                                  .chain()
                                  .focus()
                                  .insertReportVariable({
                                    key: variable.key,
                                    label: variable.label,
                                  })
                                  .run();
                              }}
                            >
                              {variable.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}

export function ReportRichTextEditor({
  value,
  onChange,
  placeholder = "",
  className,
  disabled = false,
  enableVariables = false,
  variableGroups = [],
  getVariableLabel = (key) => key,
  variablesLabel = "Variables",
  variablesSearchPlaceholder = "Search variables",
  noVariablesFoundLabel = "No variables found",
}: ReportRichTextEditorProps) {
  const t = useTranslations("ReportTemplates");
  const [zoom, setZoom] = useState(100);
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit");
  const lastEmittedHtml = useRef(value);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      TextStyle,
      FontSize,
      Color,
      LineHeight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder }),
      TableKit.configure({
        table: { resizable: true },
      }),
      Subscript,
      Superscript,
      ReportVariable.configure({ getLabel: getVariableLabel }),
      ReportEnterToLineBreak,
      ReportPageGap,
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      lastEmittedHtml.current = html;
      onChange(html);
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter") {
          event.stopPropagation();
        }
        return false;
      },
      attributes: {
        class: cn(
          "report-page-editor max-w-none bg-transparent focus:outline-none",
          "[&_span.report-variable]:inline-flex [&_span.report-variable]:items-center [&_span.report-variable]:rounded-md [&_span.report-variable]:border [&_span.report-variable]:border-sky-300 [&_span.report-variable]:bg-sky-50 [&_span.report-variable]:px-1.5 [&_span.report-variable]:py-0.5 [&_span.report-variable]:text-sky-800",
          "[&_span.report-variable[data-bold=true]]:font-bold [&_strong_span.report-variable]:font-bold [&_b_span.report-variable]:font-bold",
          "[&_span.report-variable[data-italic=true]]:italic [&_em_span.report-variable]:italic [&_i_span.report-variable]:italic",
          "[&_span.report-variable[data-underline=true]]:underline [&_u_span.report-variable]:underline",
          "[&_span.report-variable[data-strike=true]]:line-through [&_s_span.report-variable]:line-through [&_del_span.report-variable]:line-through",
          "[&_table]:w-full",
        ),
        style: `min-height: ${REPORT_CONTENT_HEIGHT_MM}mm`,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedHtml.current) return;
    if (value === editor.getHTML()) {
      lastEmittedHtml.current = value;
      return;
    }
    editor.commands.setContent(value, { emitUpdate: false });
    lastEmittedHtml.current = value;
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return (
      <div className={cn("min-h-[560px] rounded-md border bg-background", className)} />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-[520px] flex-col overflow-hidden rounded-md border bg-background",
        className,
      )}
    >
      <style>
        {reportDocumentCss(".report-page-editor")}
        {`.report-page-gap{display:block;background:transparent}.report-page-editor{min-height:${REPORT_CONTENT_HEIGHT_MM}mm}.report-page-editor span.report-variable[data-bold="true"]{font-weight:700}.report-page-editor span.report-variable[data-italic="true"]{font-style:italic}.report-page-editor span.report-variable[data-underline="true"]{text-decoration-line:underline}.report-page-editor span.report-variable[data-strike="true"]{text-decoration-line:line-through}.report-page-editor span.report-variable[data-underline="true"][data-strike="true"]{text-decoration-line:underline line-through}`}
      </style>
      <EditorToolbar
        editor={editor}
        disabled={disabled}
        enableVariables={enableVariables}
        variableGroups={variableGroups}
        variablesLabel={variablesLabel}
        variablesSearchPlaceholder={variablesSearchPlaceholder}
        noVariablesFoundLabel={noVariablesFoundLabel}
      />
      <ReportPageCanvas
        zoom={zoom}
        zoomMode={zoomMode}
        onZoomChange={setZoom}
        onZoomModeChange={setZoomMode}
        zoomLabel={t("toolbar.zoom")}
        zoomInLabel={t("toolbar.zoomIn")}
        zoomOutLabel={t("toolbar.zoomOut")}
        fitWidthLabel={t("toolbar.fitWidth")}
        pageSizeLabel={t("toolbar.pageSize")}
        pageCountLabel={(count) => t("toolbar.pageCount", { count })}
        pageBreakLabel={(page) => t("toolbar.pageBreak", { page })}
      >
        <EditorContent editor={editor} />
      </ReportPageCanvas>
    </div>
  );
}
