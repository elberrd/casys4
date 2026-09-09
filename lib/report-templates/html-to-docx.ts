import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  type IRunOptions,
} from "docx";
import {
  REPORT_PAGE_HEIGHT_MM,
  REPORT_PAGE_MARGIN_X_MM,
  REPORT_PAGE_MARGIN_Y_MM,
  REPORT_PAGE_WIDTH_MM,
} from "./page-layout";

const FONT = "Times New Roman";
const DEFAULT_SIZE = 24;
const EM_TWIPS = 240;
const BULLET_REF = "report-bullets";
const NUMBER_REF = "report-numbers";

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

interface HtmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
  text?: string;
}

interface Marks {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  subScript?: boolean;
  superScript?: boolean;
  size?: number;
  color?: string;
}

type SectionChild = Paragraph | Table;

function mmToTwip(mm: number): number {
  return Math.round((mm * 1440) / 25.4);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/&amp;/gi, "&");
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const matcher =
    /([:@a-zA-Z_][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(raw))) {
    attrs[match[1].toLowerCase()] = decodeEntities(
      match[2] ?? match[3] ?? match[4] ?? "",
    );
  }
  return attrs;
}

function parseStyle(style: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!style) return out;
  for (const part of style.split(";")) {
    const index = part.indexOf(":");
    if (index === -1) continue;
    const key = part.slice(0, index).trim().toLowerCase();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

function lengthToTwips(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(-?[\d.]+)\s*(px|pt|em|rem|mm)?$/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  const unit = (match[2] ?? "px").toLowerCase();
  if (unit === "em" || unit === "rem") return Math.round(amount * EM_TWIPS);
  if (unit === "pt") return Math.round(amount * 20);
  if (unit === "mm") return mmToTwip(amount);
  return Math.round(amount * 15);
}

function fontSizeToHalfPoints(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(-?[\d.]+)\s*(px|pt)?$/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  const unit = (match[2] ?? "px").toLowerCase();
  if (unit === "pt") return Math.round(amount * 2);
  return Math.round(amount * 1.5);
}

function colorToHex(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const hex = value.trim();
  if (/^#([0-9a-f]{6})$/i.test(hex)) return hex.slice(1).toUpperCase();
  if (/^#([0-9a-f]{3})$/i.test(hex)) {
    const [, r, g, b] = hex.split("");
    return `${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return undefined;
}

function parseHtml(html: string): HtmlNode[] {
  const root: HtmlNode = { tag: "root", attrs: {}, children: [] };
  const stack: HtmlNode[] = [root];
  const source = html.replace(/<!--[\s\S]*?-->/g, "");
  const tokenRe =
    /<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:\s[^>]*)?)\s*(\/?)>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(source))) {
    const parent = stack[stack.length - 1];
    if (!parent) break;

    if (match[4] !== undefined) {
      const text = decodeEntities(match[4]).replace(/\s+/g, " ");
      if (text) {
        parent.children.push({ tag: "#text", attrs: {}, children: [], text });
      }
      continue;
    }

    const tag = match[1].toLowerCase();
    const closing = match[0][1] === "/";
    const selfClosing = match[3] === "/" || VOID_TAGS.has(tag);

    if (closing) {
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index]?.tag === tag) {
          stack.length = index;
          break;
        }
      }
      continue;
    }

    const node: HtmlNode = {
      tag,
      attrs: parseAttrs(match[2] ?? ""),
      children: [],
    };
    parent.children.push(node);
    if (!selfClosing) stack.push(node);
  }

  return root.children;
}

function headingSize(tag: string): number | undefined {
  if (tag === "h1") return 36;
  if (tag === "h2") return 32;
  if (tag === "h3") return 28;
  return undefined;
}

function alignmentFromStyle(
  style: Record<string, string>,
): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const align = style["text-align"]?.toLowerCase();
  if (align === "center") return AlignmentType.CENTER;
  if (align === "right") return AlignmentType.RIGHT;
  if (align === "justify") return AlignmentType.JUSTIFIED;
  if (align === "left") return AlignmentType.LEFT;
  return undefined;
}

function lineTwipsFromStyle(style: Record<string, string>): number | undefined {
  const raw = style["line-height"];
  if (!raw || raw === "normal") return undefined;
  const number = Number(raw);
  if (Number.isFinite(number) && number > 0 && number < 8) {
    return Math.round(number * 240);
  }
  return lengthToTwips(raw);
}

function applyTagMarks(tag: string, marks: Marks): Marks {
  const next = { ...marks };
  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italics = true;
  if (tag === "u") next.underline = true;
  if (tag === "s" || tag === "strike" || tag === "del") next.strike = true;
  if (tag === "sub") next.subScript = true;
  if (tag === "sup") next.superScript = true;
  return next;
}

function applyStyleMarks(style: Record<string, string>, marks: Marks): Marks {
  const next = { ...marks };
  const size = fontSizeToHalfPoints(style["font-size"]);
  if (size) next.size = size;
  const color = colorToHex(style.color);
  if (color) next.color = color;
  if (style["font-weight"] === "bold" || Number(style["font-weight"]) >= 600) {
    next.bold = true;
  }
  if (style["font-style"] === "italic") next.italics = true;
  if (style["text-decoration"]?.includes("underline")) next.underline = true;
  if (style["text-decoration"]?.includes("line-through")) next.strike = true;
  return next;
}

function collectRuns(nodes: HtmlNode[], marks: Marks): TextRun[] {
  const runs: TextRun[] = [];

  for (const node of nodes) {
    if (node.tag === "#text") {
      const text = node.text ?? "";
      if (!text) continue;
      const options: IRunOptions = {
        text,
        font: FONT,
        size: marks.size ?? DEFAULT_SIZE,
        bold: marks.bold,
        italics: marks.italics,
        strike: marks.strike,
        subScript: marks.subScript,
        superScript: marks.superScript,
        color: marks.color,
        underline: marks.underline ? { type: UnderlineType.SINGLE } : undefined,
      };
      runs.push(new TextRun(options));
      continue;
    }

    const tag = node.tag.toLowerCase();
    if (tag === "br") {
      runs.push(
        new TextRun({
          break: 1,
          font: FONT,
          size: marks.size ?? DEFAULT_SIZE,
        }),
      );
      continue;
    }
    if (tag === "script" || tag === "style") continue;

    const style = parseStyle(node.attrs.style);
    const nextMarks = applyStyleMarks(style, applyTagMarks(tag, marks));
    runs.push(...collectRuns(node.children, nextMarks));
  }

  return runs;
}

function paragraphFromBlock(
  node: HtmlNode,
  extra?: {
    numbering?: { reference: string; level: number };
    fallbackBold?: boolean;
    fallbackSize?: number;
  },
): Paragraph {
  const style = parseStyle(node.attrs.style);
  const marks: Marks = {
    bold: extra?.fallbackBold,
    size: extra?.fallbackSize,
  };
  const children = collectRuns(node.children, marks);
  const spacingAfter =
    lengthToTwips(style["margin-bottom"]) ??
    lengthToTwips(style.margin) ??
    160;
  const spacingBefore = lengthToTwips(style["margin-top"]);
  const firstLine = lengthToTwips(style["text-indent"]);
  const left =
    lengthToTwips(style["padding-left"]) ?? lengthToTwips(style["margin-left"]);

  return new Paragraph({
    alignment: alignmentFromStyle(style),
    spacing: {
      after: spacingAfter,
      before: spacingBefore,
      line: lineTwipsFromStyle(style) ?? 360,
    },
    indent:
      firstLine || left
        ? {
            firstLine: firstLine,
            left,
          }
        : undefined,
    numbering: extra?.numbering,
    children:
      children.length > 0
        ? children
        : [new TextRun({ text: "", font: FONT, size: DEFAULT_SIZE })],
  });
}

function convertBlocks(
  nodes: HtmlNode[],
  list?: { reference: string; level: number },
): SectionChild[] {
  const children: SectionChild[] = [];

  for (const node of nodes) {
    if (node.tag === "#text") {
      const text = node.text?.trim();
      if (!text) continue;
      children.push(
        new Paragraph({
          spacing: { after: 160, line: 360 },
          children: [
            new TextRun({ text, font: FONT, size: DEFAULT_SIZE }),
          ],
        }),
      );
      continue;
    }

    const tag = node.tag.toLowerCase();
    if (tag === "script" || tag === "style") continue;

    if (tag === "p") {
      children.push(
        paragraphFromBlock(node, list ? { numbering: list } : undefined),
      );
      continue;
    }

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      children.push(
        paragraphFromBlock(node, {
          fallbackBold: true,
          fallbackSize: headingSize(tag),
        }),
      );
      continue;
    }

    if (tag === "blockquote") {
      children.push(...convertBlocks(node.children));
      continue;
    }

    if (tag === "ul") {
      children.push(
        ...convertListItems(node.children, {
          reference: BULLET_REF,
          level: Math.min(list ? list.level + 1 : 0, 1),
        }),
      );
      continue;
    }

    if (tag === "ol") {
      children.push(
        ...convertListItems(node.children, {
          reference: NUMBER_REF,
          level: 0,
        }),
      );
      continue;
    }

    if (tag === "li") {
      children.push(
        ...convertListItems([node], list ?? { reference: BULLET_REF, level: 0 }),
      );
      continue;
    }

    if (tag === "table") {
      children.push(convertTable(node));
      continue;
    }

    if (tag === "hr") {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: "D1D5DB",
              space: 1,
            },
          },
        }),
      );
      continue;
    }

    children.push(...convertBlocks(node.children, list));
  }

  return children;
}

function convertListItems(
  nodes: HtmlNode[],
  numbering: { reference: string; level: number },
): SectionChild[] {
  const children: SectionChild[] = [];
  for (const node of nodes) {
    if (node.tag.toLowerCase() !== "li") {
      children.push(...convertBlocks([node], numbering));
      continue;
    }
    const nestedLists = node.children.filter((child) => {
      const tag = child.tag.toLowerCase();
      return tag === "ul" || tag === "ol";
    });
    const inline = node.children.filter((child) => {
      const tag = child.tag.toLowerCase();
      return tag !== "ul" && tag !== "ol";
    });
    children.push(
      paragraphFromBlock(
        { tag: "p", attrs: node.attrs, children: inline },
        { numbering },
      ),
    );
    children.push(...convertBlocks(nestedLists, numbering));
  }
  return children;
}

function convertTable(node: HtmlNode): Table {
  const rows: HtmlNode[] = [];
  const collectRows = (nodes: HtmlNode[]) => {
    for (const child of nodes) {
      const tag = child.tag.toLowerCase();
      if (tag === "tr") rows.push(child);
      else collectRows(child.children);
    }
  };
  collectRows(node.children);

  const tableRows = (rows.length > 0 ? rows : [node]).map((row) => {
    const cells = row.children.filter((child) => {
      const tag = child.tag.toLowerCase();
      return tag === "td" || tag === "th";
    });
    return new TableRow({
      children: (cells.length > 0 ? cells : [row]).map((cell) => {
        const isHeader = cell.tag.toLowerCase() === "th";
        const content = convertBlocks(cell.children);
        const cellChildren: Array<Paragraph | Table> =
          content.length > 0
            ? content
            : [
                new Paragraph({
                  children: collectRuns(cell.children, {
                    bold: isHeader,
                  }),
                }),
              ];
        return new TableCell({
          children: cellChildren,
          shading: isHeader
            ? { type: ShadingType.CLEAR, fill: "F3F4F6" }
            : undefined,
        });
      }),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

export function htmlToDocxDocument(html: string): Document {
  const parsed = parseHtml(html);
  let children = convertBlocks(parsed);
  if (children.length === 0) {
    children = [
      new Paragraph({
        children: [new TextRun({ text: "", font: FONT, size: DEFAULT_SIZE })],
      }),
    ];
  }

  return new Document({
    numbering: {
      config: [
        {
          reference: BULLET_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: "o",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 1080, hanging: 360 },
                },
              },
            },
          ],
        },
        {
          reference: NUMBER_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: mmToTwip(REPORT_PAGE_WIDTH_MM),
              height: mmToTwip(REPORT_PAGE_HEIGHT_MM),
            },
            margin: {
              top: mmToTwip(REPORT_PAGE_MARGIN_Y_MM),
              bottom: mmToTwip(REPORT_PAGE_MARGIN_Y_MM),
              left: mmToTwip(REPORT_PAGE_MARGIN_X_MM),
              right: mmToTwip(REPORT_PAGE_MARGIN_X_MM),
            },
          },
        },
        children,
      },
    ],
  });
}

export async function htmlToDocxBlob(html: string): Promise<Blob> {
  return Packer.toBlob(htmlToDocxDocument(html));
}
