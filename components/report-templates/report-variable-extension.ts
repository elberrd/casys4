import { Node, isNodeSelection, mergeAttributes } from "@tiptap/core";

export type ReportVariableFormatAttr =
  | "bold"
  | "italic"
  | "underline"
  | "strike";

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
  marks: "",

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
        ({ commands, state }) => {
          const { selection } = state;
          if (
            !isNodeSelection(selection) ||
            selection.node.type.name !== this.name
          ) {
            return false;
          }
          return commands.updateAttributes(this.name, {
            [attr]: !selection.node.attrs[attr],
          });
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
