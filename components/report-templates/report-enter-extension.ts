import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import type { Selection, Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

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

export function isReportEditorEnterEvent(event: {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): boolean {
  return (
    event.key === "Enter" &&
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

function setCaretNear(tr: Transaction, pos: number, selection: Selection) {
  const maxPos = Math.max(1, tr.doc.content.size - 1);
  const clamped = Math.max(1, Math.min(pos, maxPos));
  const SelectionClass = Object.getPrototypeOf(selection).constructor as {
    near: (resolved: ReturnType<Transaction["doc"]["resolve"]>, bias?: number) => Selection;
  };
  tr.setSelection(SelectionClass.near(tr.doc.resolve(clamped), 1));
}

function insertNewlineText(view: EditorView): boolean {
  try {
    view.dispatch(view.state.tr.insertText("\n").scrollIntoView());
    return true;
  } catch {
    return false;
  }
}

export function insertReportHardBreak(view: EditorView): boolean {
  const type = view.state.schema.nodes.hardBreak;
  if (type) {
    try {
      const node = type.create();
      view.dispatch(
        view.state.tr.replaceSelectionWith(node, false).scrollIntoView(),
      );
      return true;
    } catch {
      // Dual prosemirror-model copies make some replace paths throw.
    }
  }
  return insertNewlineText(view);
}

/**
 * Split the current textblock without Transform.split / splitBlock.
 * Those go through Fragment.empty and throw
 * "Can not convert <> to a Fragment" when two prosemirror-model copies
 * exist in the client bundle (the deployed preview still did).
 *
 * JSON round-trip uses this editor's schema (nodes have .attrs), which is
 * the same path Tab/insertContent already uses successfully.
 */
export function insertReportEnter(view: EditorView): boolean {
  const { state } = view;
  const { selection, schema } = state;
  const { $from, $to, empty, from, to } = selection;

  if ($from.parent.type.spec.code) {
    return insertNewlineText(view);
  }

  if (!$from.parent.isTextblock || $from.parent !== $to.parent) {
    return insertReportHardBreak(view);
  }

  try {
    const parent = $from.parent;
    const start = $from.start();
    const cutFrom = empty ? $from.parentOffset : Math.max(0, from - start);
    const cutTo = empty
      ? $from.parentOffset
      : Math.min(parent.content.size, to - start);
    const first = schema.nodeFromJSON(parent.cut(0, cutFrom).toJSON());
    const second = schema.nodeFromJSON(parent.cut(cutTo).toJSON());
    const fromPos = $from.before();
    const toPos = $from.after();
    const tr = state.tr.replaceWith(fromPos, toPos, [first, second]);
    try {
      setCaretNear(tr, fromPos + first.nodeSize + 1, selection);
    } catch {
      // Split still applied; caret may stay on the first block.
    }
    view.dispatch(tr.scrollIntoView());
    return true;
  } catch {
    return insertReportHardBreak(view);
  }
}

/**
 * Tab inserts a real tab (or indents a list). Enter splits the current
 * block via schema JSON — never TipTap/ProseMirror splitBlock.
 * Callers must stop Tab/Enter from bubbling so a surrounding dialog
 * cannot steal them.
 */
export const ReportEditorKeys = Extension.create({
  name: "reportEditorKeys",
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Tab: () => insertReportTab(this.editor),
      "Shift-Tab": () => outdentReportTab(this.editor),
      Enter: () => {
        insertReportEnter(this.editor.view);
        return true;
      },
      "Shift-Enter": () => {
        insertReportHardBreak(this.editor.view);
        return true;
      },
    };
  },
});

/** @deprecated Use ReportEditorKeys. Kept so existing imports keep compiling. */
export const ReportEnterToLineBreak = ReportEditorKeys;
