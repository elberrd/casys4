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
  },
): Paragraph {
  return new Paragraph({
    alignment: options?.alignment,
    spacing: {
      after: options?.spacingAfter ?? 200,
      before: options?.spacingBefore,
      line: 360,
    },
    indent: options?.indent ? { firstLine: options.indent } : undefined,
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
            indent: 400,
            spacingAfter: 300,
          }),
          ...report.closingLines.map((line) =>
            paragraph(line, { spacingAfter: 80 }),
          ),
          paragraph(runsToText(report.locationDate), { spacingBefore: 360 }),
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
