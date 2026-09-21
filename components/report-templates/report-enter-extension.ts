import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";

export const REPORT_TAB_CHAR = "\t";

export function isReportEditorTabEvent(event: {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): boolean {
  return (
    event.key === "Tab" &&
    event.altKey !== true &&
    event.ctrlKey !== true &&
    event.metaKey !== true
  );
}

export function shouldStopReportEditorKeyPropagation(event: {
  key: string;
}): boolean {
  return event.key === "Tab" || event.key === "Enter";
}

export function insertReportTab(editor: Editor): boolean {
  if (editor.can().sinkListItem("listItem")) {
    return editor.commands.sinkListItem("listItem");
  }
  return editor.chain().insertContent(REPORT_TAB_CHAR).run();
}

export function outdentReportTab(editor: Editor): boolean {
  if (editor.can().liftListItem("listItem")) {
    return editor.commands.liftListItem("listItem");
  }
  return true;
}

/**
 * Tab inserts a real tab (or indents a list). Enter is left to TipTap so it
 * splits the block like a normal text editor. Callers must stop Tab/Enter from
 * bubbling so a surrounding dialog cannot steal them.
 */
export const ReportEditorKeys = Extension.create({
  name: "reportEditorKeys",
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Tab: () => insertReportTab(this.editor),
      "Shift-Tab": () => outdentReportTab(this.editor),
    };
  },
});

/** @deprecated Use ReportEditorKeys. Kept so existing imports keep compiling. */
export const ReportEnterToLineBreak = ReportEditorKeys;
