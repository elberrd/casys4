import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
} from "docx"
import type { CriminalBackgroundDeclaration, ReportRun } from "@/lib/process-reports/types"

const FONT = "Times New Roman"
const SIZE = 24
const TAB_INDENT = 400

function runsToText(runs: ReportRun[]): TextRun[] {
  return runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: run.bold === true,
        font: FONT,
        size: SIZE,
      }),
  )
}

function paragraph(
  children: TextRun[] | string,
  options?: {
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]
    spacingAfter?: number
    spacingBefore?: number
    indent?: number
    leftIndent?: number
    line?: number
  },
): Paragraph {
  return new Paragraph({
    alignment: options?.alignment,
    spacing: {
      after: options?.spacingAfter ?? 200,
      before: options?.spacingBefore,
      line: options?.line ?? 360,
    },
    indent: options?.indent
      ? { firstLine: options.indent }
      : options?.leftIndent
        ? { left: options.leftIndent }
        : undefined,
    children:
      typeof children === "string"
        ? [new TextRun({ text: children, font: FONT, size: SIZE })]
        : children,
  })
}

export async function buildCriminalBackgroundDeclarationDocx(
  report: CriminalBackgroundDeclaration,
): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: report.title,
                bold: true,
                font: FONT,
                size: 32,
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
          }),
          ...report.recipientLines.map((line) =>
            paragraph(line, { spacingAfter: 0 }),
          ),
          paragraph(""),
          paragraph(report.salutation, { spacingAfter: 300 }),
          paragraph(runsToText(report.body), {
            indent: TAB_INDENT,
            spacingAfter: 300,
          }),
          paragraph(report.closingStatement, {
            leftIndent: TAB_INDENT,
            spacingAfter: 240,
          }),
          ...report.petitionLines.map((line, index) =>
            paragraph(line, {
              leftIndent: TAB_INDENT,
              spacingBefore: 0,
              spacingAfter: index === report.petitionLines.length - 1 ? 80 : 0,
              line: 276,
            }),
          ),
          paragraph(runsToText(report.locationDate), {
            spacingBefore: 360,
            alignment: AlignmentType.CENTER,
          }),
          paragraph(""),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
            children: [
              new TextRun({
                text: report.signatureName,
                bold: true,
                font: FONT,
                size: SIZE,
              }),
            ],
          }),
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}
