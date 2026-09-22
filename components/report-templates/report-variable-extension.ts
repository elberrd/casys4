import { Node, mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

type EditorState = Editor["state"];
type EditorTransaction = EditorState["tr"];
type PMNode = NonNullable<ReturnType<EditorState["doc"]["nodeAt"]>>;

export type ReportVariableFormatAttr =
  | "bold"
  | "italic"
  | "underline"
  | "strike";

export const FORMAT_ATTRS: readonly ReportVariableFormatAttr[] = [
  "bold",
  "italic",
  "underline",
  "strike",
];

export const FORMAT_MARK_NAME: Record<ReportVariableFormatAttr, string> = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  strike: "strike",
};

const FORMAT_INNER_TAGS: Record<ReportVariableFormatAttr, readonly string[]> = {
  bold: ["STRONG", "B"],
  italic: ["EM", "I"],
  underline: ["U"],
  strike: ["S", "STRIKE", "DEL"],
};

function parseFormatAttr(
  element: HTMLElement,
  attr: ReportVariableFormatAttr,
): boolean {
  if (element.getAttribute(`data-${attr}`) === "true") return true;
  const style = element.getAttribute("style")?.toLowerCase() ?? "";
  if (attr === "bold" && /font-weight\s*:\s*(bold|[6-9]00)/.test(style)) {
    return true;
  }
  if (attr === "italic" && /font-style\s*:\s*italic/.test(style)) {
    return true;
  }
  if (
    attr === "underline" &&
    /text-decoration(?:-line)?\s*:[^;]*underline/.test(style)
  ) {
    return true;
  }
  if (
    attr === "strike" &&
    /text-decoration(?:-line)?\s*:[^;]*line-through/.test(style)
  ) {
    return true;
  }
  const tags = FORMAT_INNER_TAGS[attr];
  return tags.some((tag) => element.querySelector(tag.toLowerCase()) !== null);
}

function formatAttribute(attr: ReportVariableFormatAttr) {
  return {
    default: false,
    parseHTML: (element: HTMLElement) => parseFormatAttr(element, attr),
    renderHTML: (attributes: Record<string, unknown>) => {
      if (attributes[attr] !== true && attributes[attr] !== "true") {
        return {};
      }
      return { [`data-${attr}`]: "true" };
    },
  };
}

function isReportVariableNode(
  node: { type: { name: string } } | null | undefined,
): node is PMNode {
  return node?.type.name === "reportVariable";
}

export function findReportVariablesInRange(
  state: EditorState,
  from: number,
  to: number,
): Array<{ node: PMNode; pos: number }> {
  const found: Array<{ node: PMNode; pos: number }> = [];
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  state.doc.nodesBetween(start, Math.max(end, start + 1), (node, pos) => {
    if (isReportVariableNode(node)) {
      found.push({ node, pos });
    }
  });
  return found;
}

/**
 * Locates the report variable chip under the current selection.
 * Uses duck-typing instead of `instanceof` so duplicate ProseMirror copies
 * still match a NodeSelection of the chip.
 */
export function findSelectedReportVariable(
  state: EditorState,
): { node: PMNode; pos: number } | null {
  const { selection } = state;
  if ("node" in selection) {
    const node = (selection as { node: PMNode }).node;
    if (isReportVariableNode(node)) {
      return { node, pos: selection.from };
    }
  }

  const atFrom = state.doc.nodeAt(selection.from);
  if (isReportVariableNode(atFrom)) {
    return { node: atFrom, pos: selection.from };
  }

  if (selection.empty) {
    const after = selection.$from.nodeAfter;
    if (isReportVariableNode(after)) {
      return { node: after, pos: selection.from };
    }
    const before = selection.$from.nodeBefore;
    if (isReportVariableNode(before)) {
      return { node: before, pos: selection.from - before.nodeSize };
    }
  } else {
    const inRange = findReportVariablesInRange(
      state,
      selection.from,
      selection.to,
    );
    if (inRange.length === 1) {
      const chip = inRange[0];
      if (
        chip &&
        selection.from >= chip.pos &&
        selection.to <= chip.pos + chip.node.nodeSize
      ) {
        return chip;
      }
    }
  }

  return null;
}

export function variableHasFormat(
  state: EditorState,
  node: PMNode,
  pos: number,
  attr: ReportVariableFormatAttr,
): boolean {
  if (node.attrs[attr] === true) return true;
  const markType = state.schema.marks[FORMAT_MARK_NAME[attr]];
  if (!markType) return false;
  if (markType.isInSet(node.marks)) return true;
  return state.doc.rangeHasMark(pos, pos + node.nodeSize, markType);
}

export function isReportVariableFormatActive(
  editor: Editor,
  attr: ReportVariableFormatAttr,
): boolean {
  const found = findSelectedReportVariable(editor.state);
  if (found) {
    return variableHasFormat(editor.state, found.node, found.pos, attr);
  }
  return editor.isActive(FORMAT_MARK_NAME[attr]);
}

function applyVariableFormat(
  state: EditorState,
  dispatch: ((tr: EditorTransaction) => void) | undefined,
  attr: ReportVariableFormatAttr,
  nextValue: boolean,
  found: { node: PMNode; pos: number },
): boolean {
  const markType = state.schema.marks[FORMAT_MARK_NAME[attr]];
  const { pos, node } = found;
  const end = pos + node.nodeSize;
  let tr = state.tr.setNodeMarkup(pos, undefined, {
    ...node.attrs,
    [attr]: nextValue,
  });
  if (markType) {
    if (nextValue) {
      tr = tr.addMark(pos, end, markType.create());
    } else {
      tr = tr.removeMark(pos, end, markType);
    }
  }
  const mappedPos = tr.mapping.map(pos);
  tr = tr.setSelection(NodeSelection.create(tr.doc, mappedPos));
  // Chip marks must not become storedMarks for the next typed character.
  tr = tr.setStoredMarks([]);
  if (dispatch) {
    dispatch(tr);
  }
  return true;
}

function applyVariableFormatInRange(
  state: EditorState,
  dispatch: ((tr: EditorTransaction) => void) | undefined,
  attr: ReportVariableFormatAttr,
  nextValue: boolean,
): boolean {
  const chips = findReportVariablesInRange(
    state,
    state.selection.from,
    state.selection.to,
  );
  if (chips.length === 0) return false;
  const markType = state.schema.marks[FORMAT_MARK_NAME[attr]];
  let tr = state.tr;
  for (const chip of chips) {
    const pos = tr.mapping.map(chip.pos);
    const node = tr.doc.nodeAt(pos);
    if (!isReportVariableNode(node)) continue;
    const end = pos + node.nodeSize;
    tr = tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      [attr]: nextValue,
    });
    if (!markType) continue;
    if (nextValue) {
      tr = tr.addMark(pos, end, markType.create());
    } else {
      tr = tr.removeMark(pos, end, markType);
    }
  }
  if (dispatch) {
    dispatch(tr);
  }
  return true;
}

function selectReportVariableOnClick(
  view: EditorView,
  node: PMNode,
  nodePos: number,
): boolean {
  if (!isReportVariableNode(node)) return false;
  const tr = view.state.tr.setSelection(
    NodeSelection.create(view.state.doc, nodePos),
  );
  view.dispatch(tr);
  return true;
}

function selectReportVariableAtPos(view: EditorView, pos: number): boolean {
  const { state } = view;
  const nodeAt = state.doc.nodeAt(pos);
  if (isReportVariableNode(nodeAt)) {
    return selectReportVariableOnClick(view, nodeAt, pos);
  }
  const $pos = state.doc.resolve(pos);
  const before = $pos.nodeBefore;
  if (isReportVariableNode(before)) {
    return selectReportVariableOnClick(
      view,
      before,
      pos - before.nodeSize,
    );
  }
  const after = $pos.nodeAfter;
  if (isReportVariableNode(after)) {
    return selectReportVariableOnClick(view, after, pos);
  }
  return false;
}

function clearChipStoredMarks(state: EditorState): EditorTransaction | null {
  const { selection } = state;
  if (!selection.empty) return null;
  const before = selection.$from.nodeBefore;
  if (!isReportVariableNode(before)) return null;
  const after = selection.$from.nodeAfter;
  const stored = state.storedMarks ?? selection.$from.marks();
  if (stored.length === 0) return null;
  const afterMarks = after?.marks ?? [];
  const keep = stored.filter((mark) => {
    const onChip = mark.isInSet(before.marks);
    if (!onChip) return true;
    return mark.isInSet(afterMarks);
  });
  if (keep.length === stored.length) return null;
  return state.tr.setStoredMarks(keep);
}

/**
 * If Bold/Italic/etc. was applied as a wrapping mark (chip looks formatted
 * but attrs were never written), copy the mark onto data-* so getHTML
 * persists `data-bold="true"` for reopen/generate.
 */
export function syncChipFormatAttrsFromMarks(
  state: EditorState,
  baseTr?: EditorTransaction,
): EditorTransaction | null {
  let tr = baseTr ?? state.tr;
  let changed = Boolean(baseTr);
  state.doc.descendants((node, pos) => {
    if (!isReportVariableNode(node)) return;
    const nextAttrs = { ...node.attrs };
    let dirty = false;
    for (const attr of FORMAT_ATTRS) {
      const markType = state.schema.marks[FORMAT_MARK_NAME[attr]];
      if (!markType) continue;
      const hasMark =
        Boolean(markType.isInSet(node.marks)) ||
        state.doc.rangeHasMark(pos, pos + node.nodeSize, markType);
      if (hasMark && node.attrs[attr] !== true) {
        nextAttrs[attr] = true;
        dirty = true;
      }
    }
    if (!dirty) return;
    tr = tr.setNodeMarkup(tr.mapping.map(pos), undefined, nextAttrs);
    changed = true;
  });
  return changed ? tr : null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    reportVariable: {
      insertReportVariable: (attrs: {
        key: string;
        label: string;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        strike?: boolean;
      }) => ReturnType;
      toggleReportVariableFormat: (
        attr: ReportVariableFormatAttr,
      ) => ReturnType;
      setReportVariableFormatInRange: (
        attr: ReportVariableFormatAttr,
        nextValue: boolean,
      ) => ReturnType;
    };
  }
}

const reportVariableMarksKey = new PluginKey("reportVariableMarks");

export const ReportVariable = Node.create<{
  getLabel: (key: string) => string;
}>({
  name: "reportVariable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  marks: "bold italic underline strike",

  addOptions() {
    return {
      getLabel: (key: string) => key,
    };
  },

  addAttributes() {
    return {
      key: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-key") ?? "",
        renderHTML: (attributes) => ({
          "data-key": attributes.key,
        }),
      },
      label: {
        default: "",
        parseHTML: (element) => element.textContent?.trim() ?? "",
        renderHTML: () => ({}),
      },
      bold: formatAttribute("bold"),
      italic: formatAttribute("italic"),
      underline: formatAttribute("underline"),
      strike: formatAttribute("strike"),
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="report-variable"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const label =
      this.options.getLabel(node.attrs.key) ||
      node.attrs.label ||
      node.attrs.key;
    const formatAttrs: Record<string, string> = {};
    for (const attr of FORMAT_ATTRS) {
      if (node.attrs[attr] === true || node.attrs[attr] === "true") {
        formatAttrs[`data-${attr}`] = "true";
      }
    }
    return [
      "span",
      mergeAttributes(
        {
          "data-type": "report-variable",
          class: "report-variable",
        },
        formatAttrs,
        HTMLAttributes,
      ),
      label,
    ];
  },

  addCommands() {
    return {
      insertReportVariable:
        (attrs) =>
        ({ commands, state }) => {
          const marks = state.storedMarks ?? state.selection.$from.marks();
          const hasMark = (typeName: string) =>
            marks.some((mark) => mark.type.name === typeName);
          return commands.insertContent({
            type: this.name,
            attrs: {
              key: attrs.key,
              label: attrs.label,
              bold: attrs.bold ?? hasMark("bold"),
              italic: attrs.italic ?? hasMark("italic"),
              underline: attrs.underline ?? hasMark("underline"),
              strike: attrs.strike ?? hasMark("strike"),
            },
          });
        },
      toggleReportVariableFormat:
        (attr) =>
        ({ state, dispatch }) => {
          const found = findSelectedReportVariable(state);
          if (!found) {
            return false;
          }
          const currentlyOn = variableHasFormat(
            state,
            found.node,
            found.pos,
            attr,
          );
          return applyVariableFormat(
            state,
            dispatch,
            attr,
            !currentlyOn,
            found,
          );
        },
      setReportVariableFormatInRange:
        (attr, nextValue) =>
        ({ state, dispatch }) => {
          return applyVariableFormatInRange(state, dispatch, attr, nextValue);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-b": () => this.editor.commands.toggleReportVariableFormat("bold"),
      "Mod-i": () => this.editor.commands.toggleReportVariableFormat("italic"),
      "Mod-u": () => this.editor.commands.toggleReportVariableFormat("underline"),
      "Mod-Shift-s": () =>
        this.editor.commands.toggleReportVariableFormat("strike"),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: reportVariableMarksKey,
        props: {
          handleClickOn(view, _pos, node, nodePos) {
            return selectReportVariableOnClick(view, node as PMNode, nodePos);
          },
          handleClick(view, pos) {
            return selectReportVariableAtPos(view, pos);
          },
        },
        appendTransaction(_transactions, _oldState, newState) {
          const stored = clearChipStoredMarks(newState);
          const stateForSync = stored ? newState.apply(stored) : newState;
          return syncChipFormatAttrsFromMarks(stateForSync, stored ?? undefined);
        },
      }),
    ];
  },
});
