import { Extension, getStyleProperty } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import {
  isReportLineHeightValue,
  normalizeReportLineHeight,
} from "@/lib/report-templates/line-height";

const LINE_HEIGHT_BLOCKS = ["paragraph", "heading"] as const;

function readLineHeight(element: HTMLElement): string | null {
  const raw =
    getStyleProperty(element, "line-height") ?? element.style.lineHeight;
  const normalized = normalizeReportLineHeight(raw);
  return normalized || null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    reportLineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

/**
 * Paragraph/heading line-height (Word-like). TipTap's LineHeight command
 * only sets an inline textStyle mark, which cannot override the document
 * `p { line-height: 1.6 }` strut — so "espaçamento 1" must live on blocks.
 */
export const ReportLineHeight = Extension.create({
  name: "reportLineHeight",

  addGlobalAttributes() {
    return [
      {
        types: [...LINE_HEIGHT_BLOCKS, "textStyle"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) => readLineHeight(element),
            renderHTML: (attributes: Record<string, unknown>) => {
              const lineHeight = normalizeReportLineHeight(
                typeof attributes.lineHeight === "string"
                  ? attributes.lineHeight
                  : "",
              );
              if (!lineHeight) return {};
              return { style: `line-height: ${lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) => {
          const normalized = normalizeReportLineHeight(lineHeight);
          if (!normalized || !isReportLineHeightValue(normalized)) {
            return false;
          }
          return LINE_HEIGHT_BLOCKS.map((type) =>
            commands.updateAttributes(type, { lineHeight: normalized }),
          ).some(Boolean);
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return LINE_HEIGHT_BLOCKS.map((type) =>
            commands.resetAttributes(type, "lineHeight"),
          ).some(Boolean);
        },
    };
  },
});

export function getCurrentReportLineHeight(editor: Editor): string {
  for (const type of LINE_HEIGHT_BLOCKS) {
    const value = editor.getAttributes(type).lineHeight;
    const normalized = normalizeReportLineHeight(
      typeof value === "string" ? value : "",
    );
    if (normalized) return normalized;
  }
  const textStyle = editor.getAttributes("textStyle").lineHeight;
  return normalizeReportLineHeight(
    typeof textStyle === "string" ? textStyle : "",
  );
}
