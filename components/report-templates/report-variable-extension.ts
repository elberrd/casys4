import { Node, mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

type EditorState = Editor["state"];
type EditorTransaction = EditorState["tr"];
type PMNode = NonNullable<ReturnType<EditorState["doc"]["nodeAt"]>>;

export type ReportVariableFormatAttr =
  | "bold"
  | "italic"
  | "underline"
  | "strike";

export const FORMAT_MARK_NAME: Record<ReportVariableFormatAttr, string> = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  strike: "strike",
};

const FORMAT_ANCESTOR_TAGS: Record<ReportVariableFormatAttr, readonly string[]> =
  {
    bold: ["STRONG", "B"],
    italic: ["EM", "I"],
    underline: ["U"],
    strike: ["S", "STRIKE", "DEL"],
  };

const BLOCK_ANCESTOR_TAGS = new Set([
  "P",
  "DIV",
  "LI",
  "TD",
  "TH",
  "H1",
  "H2",
  "H3",
  "H4",
  "BLOCKQUOTE",
  "PRE",
]);

function hasAncestorTag(
  element: HTMLElement,
  tags: readonly string[],
): boolean {
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    if (tags.includes(current.tagName)) return true;
    if (BLOCK_ANCESTOR_TAGS.has(current.tagName)) break;
    current = current.parentElement;
  }
  return false;
}

function parseFormatAttr(
  element: HTMLElement,
  attr: ReportVariableFormatAttr,
): boolean {
  if (element.getAttribute(`data-${attr}`) === "true") return true;
  return hasAncestorTag(element, FORMAT_ANCESTOR_TAGS[attr]);
}

function formatAttribute(attr: ReportVariableFormatAttr) {
  return {
    default: false,
    parseHTML: (element: HTMLElement) => parseFormatAttr(element, attr),
    renderHTML: (attributes: Record<string, unknown>) => {
      if (!attributes[attr]) return {};
      return { [`data-${attr}`]: "true" };
    },
  };
}

function isReportVariableNode(
  node: { type: { name: string } } | null | undefined,
): node is PMNode {
  return node?.type.name === "reportVariable";
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
  if (dispatch) {
    dispatch(tr);
  }
  return true;
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
    };
  }
}

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
    return [
      "span",
      mergeAttributes(
        {
          "data-type": "report-variable",
          class: "report-variable",
        },
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
});
