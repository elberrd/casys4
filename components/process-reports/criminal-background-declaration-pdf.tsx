import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { CriminalBackgroundDeclaration, ReportRun } from "@/lib/process-reports/types"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 12,
    paddingTop: 72,
    paddingBottom: 72,
    paddingHorizontal: 72,
    lineHeight: 1.6,
  },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 16,
    textAlign: "center",
    textDecoration: "underline",
    marginBottom: 28,
  },
  block: {
    marginBottom: 18,
  },
  line: {
    marginBottom: 0,
  },
  paragraph: {
    textAlign: "justify",
    marginBottom: 18,
    textIndent: 28,
  },
  closing: {
    marginBottom: 2,
  },
  location: {
    marginTop: 22,
    marginBottom: 48,
  },
  signature: {
    fontFamily: "Times-Bold",
    textAlign: "center",
  },
  bold: {
    fontFamily: "Times-Bold",
  },
})

function PdfRuns({ runs }: { runs: ReportRun[] }) {
  return (
    <Text>
      {runs.map((run, index) => (
        <Text key={`${index}-${run.text.slice(0, 8)}`} style={run.bold ? styles.bold : undefined}>
          {run.text}
        </Text>
      ))}
    </Text>
  )
}

export function CriminalBackgroundDeclarationPdf({
  report,
}: {
  report: CriminalBackgroundDeclaration
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{report.title}</Text>

        <View style={styles.block}>
          {report.recipientLines.map((line) => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>

        <Text style={styles.block}>{report.salutation}</Text>

        <View style={styles.paragraph}>
          <PdfRuns runs={report.body} />
        </View>

        <View style={styles.block}>
          {report.closingLines.map((line) => (
            <Text key={line} style={styles.closing}>
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.location}>
          <PdfRuns runs={report.locationDate} />
        </View>

        <Text style={styles.signature}>{report.signatureName}</Text>
      </Page>
    </Document>
  )
}
