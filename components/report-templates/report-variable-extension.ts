import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    reportVariable: {
      insertReportVariable: (attrs: {
        key: string;
        label: string;
      }) => ReturnType;
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
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
