import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  REPORT_CONTENT_HEIGHT_MM,
  REPORT_PAGE_HEIGHT_MM,
  REPORT_PAGE_MARGIN_X_MM,
  REPORT_PAGE_SPACER_MM,
  countReportContentPages,
} from "@/lib/report-templates/page-layout";

const reportPageGapKey = new PluginKey("reportPageGap");

type EditorViewLike = {
  dom: HTMLElement;
  state: {
    doc: unknown;
    tr: {
      setMeta: (key: unknown, value: unknown) => {
        setMeta: (key: string, value: boolean) => unknown;
      };
    };
  };
  dispatch: (tr: unknown) => void;
  coordsAtPos: (pos: number) => { top: number };
};

function createPageGapElement(): HTMLElement {
  const element = document.createElement("div");
  element.className = "report-page-gap";
  element.contentEditable = "false";
  element.dataset.reportPageGap = "true";
  element.style.height = `${REPORT_PAGE_SPACER_MM}mm`;
  element.style.marginLeft = `-${REPORT_PAGE_MARGIN_X_MM}mm`;
  element.style.marginRight = `-${REPORT_PAGE_MARGIN_X_MM}mm`;
  element.style.width = `calc(100% + ${REPORT_PAGE_MARGIN_X_MM * 2}mm)`;
  element.style.pointerEvents = "none";
  element.style.userSelect = "none";
  return element;
}

function gapHeightTotal(prose: HTMLElement): number {
  let total = 0;
  prose.querySelectorAll<HTMLElement>(".report-page-gap").forEach((gap) => {
    total += gap.getBoundingClientRect().height;
  });
  return total;
}

function contentYAtPos(
  view: EditorViewLike,
  pos: number,
  proseTop: number,
): number {
  try {
    const coords = view.coordsAtPos(pos);
    let y = coords.top - proseTop;
    view.dom.querySelectorAll<HTMLElement>(".report-page-gap").forEach((gap) => {
      const rect = gap.getBoundingClientRect();
      if (rect.top - proseTop + 0.5 < y) {
        y -= rect.height;
      }
    });
    return y;
  } catch {
    return 0;
  }
}

function posForContentY(view: EditorViewLike, targetY: number): number | null {
  const doc = view.state.doc as { content: { size: number } };
  const max = doc.content.size;
  if (max <= 1) return null;
  const proseTop = view.dom.getBoundingClientRect().top;
  let lo = 1;
  let hi = max;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (contentYAtPos(view, mid, proseTop) < targetY) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function decorationSignature(set: DecorationSet): string {
  return set
    .find()
    .map((decoration) => `${decoration.from}:${String(decoration.spec.key ?? "")}`)
    .join("|");
}

function buildPageGapDecorations(view: EditorViewLike): DecorationSet {
  const stack = view.dom.closest("[data-report-page-stack]");
  const sheet = stack?.querySelector<HTMLElement>("[data-report-page-sheet]");
  const prose = view.dom;
  if (!sheet) {
    return DecorationSet.empty;
  }

  const pageHeightPx = sheet.getBoundingClientRect().height;
  if (pageHeightPx < 8) {
    return DecorationSet.empty;
  }

  const contentPagePx =
    pageHeightPx * (REPORT_CONTENT_HEIGHT_MM / REPORT_PAGE_HEIGHT_MM);
  const contentHeightPx = Math.max(
    0,
    prose.getBoundingClientRect().height - gapHeightTotal(prose),
  );
  const pageCount = countReportContentPages(contentHeightPx, contentPagePx);
  if (pageCount <= 1) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];
  const used = new Set<number>();
  for (let page = 1; page < pageCount; page += 1) {
    const pos = posForContentY(view, page * contentPagePx);
    if (pos === null || used.has(pos)) continue;
    used.add(pos);
    decorations.push(
      Decoration.widget(pos, createPageGapElement, {
        side: -1,
        key: `report-page-gap-${page}`,
      }),
    );
  }
  return DecorationSet.create(view.state.doc as never, decorations);
}

export const ReportPageGap = Extension.create({
  name: "reportPageGap",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: reportPageGapKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, decorations: DecorationSet) {
            const next = tr.getMeta(reportPageGapKey) as DecorationSet | undefined;
            if (next) {
              return next;
            }
            if (tr.docChanged) {
              return decorations.map(tr.mapping, tr.doc as never);
            }
            return decorations;
          },
        },
        props: {
          decorations(state) {
            return reportPageGapKey.getState(state) ?? DecorationSet.empty;
          },
        },
        view(editorView) {
          const view = editorView as unknown as EditorViewLike;
          let frame = 0;
          let lastSignature = "";

          const rebuild = () => {
            const next = buildPageGapDecorations(view);
            const signature = decorationSignature(next);
            if (signature === lastSignature) return;
            lastSignature = signature;
            view.dispatch(
              view.state.tr
                .setMeta(reportPageGapKey, next)
                .setMeta("addToHistory", false),
            );
          };

          const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(rebuild);
          };

          const observer = new ResizeObserver(schedule);
          observer.observe(view.dom);
          schedule();

          return {
            update() {
              schedule();
            },
            destroy() {
              cancelAnimationFrame(frame);
              observer.disconnect();
            },
          };
        },
      }),
    ];
  },
});
