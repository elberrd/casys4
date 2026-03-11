import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type {
  PdfReportMode,
  ProcessInfoForReport,
  PdfDocumentItem,
  PdfExigenciaGroup,
} from "@/lib/utils/pdf-report-helpers"

const NAVY = "#1a365d"
const LIGHT_GRAY = "#f7fafc"
const BORDER_COLOR = "#e2e8f0"
const ORANGE = "#c05621"
const ORANGE_BG = "#fefcbf"
const GRAY_STATUS = "#718096"

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 20,
  },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 2,
  },
  generationDate: {
    fontSize: 8,
    color: "#718096",
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: NAVY,
    marginBottom: 16,
    marginTop: 8,
  },
  infoGrid: {
    backgroundColor: LIGHT_GRAY,
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    width: "35%",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#4a5568",
  },
  infoValue: {
    width: "65%",
    fontSize: 9,
    color: "#2d3748",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 8,
    marginTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_COLOR,
  },
  // Table header
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: NAVY,
    borderRadius: 2,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  colNum: { width: "7%" },
  colName: { width: "51%" },
  colDeadline: { width: "20%", textAlign: "center" },
  colStatus: { width: "22%", textAlign: "right" },
  // Doc rows
  docRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_COLOR,
    alignItems: "center",
  },
  docRowAlt: {
    backgroundColor: LIGHT_GRAY,
  },
  docNumber: {
    fontSize: 9,
    color: "#718096",
  },
  docName: {
    fontSize: 9,
    color: "#2d3748",
  },
  // Status badges
  statusBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    textAlign: "center",
  },
  statusExigencia: {
    color: ORANGE,
    backgroundColor: ORANGE_BG,
    borderWidth: 0.5,
    borderColor: ORANGE,
  },
  statusPending: {
    color: GRAY_STATUS,
    backgroundColor: "#edf2f7",
    borderWidth: 0.5,
    borderColor: "#cbd5e0",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#a0aec0",
    borderTopWidth: 0.5,
    borderTopColor: BORDER_COLOR,
    paddingTop: 6,
  },
  exigenciaSubtitle: {
    fontSize: 9,
    color: ORANGE,
    marginBottom: 6,
    fontFamily: "Helvetica-Oblique",
  },
  sectionTitleExigencia: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: ORANGE,
    marginBottom: 4,
    marginTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: ORANGE,
  },
})

interface PendingDocumentsPdfTemplateProps {
  processInfo: ProcessInfoForReport
  pendingDocuments: PdfDocumentItem[]
  exigenciaGroups: PdfExigenciaGroup[]
  reportMode: PdfReportMode
  generatedAt: string
  labels: {
    reportTitle: string
    generatedAt: string
    person: string
    legalFramework: string
    processType: string
    company: string
    referenceNumber: string
    protocolNumber: string
    dateProcess: string
    exigenciaSection: string
    pendingSection: string
    pendingSectionTitle: string
    required: string
    optional: string
    page: string
    of: string
    companyDoc: string
    document: string
    deadline: string
    status: string
  }
}

export function PendingDocumentsPdfTemplate({
  processInfo,
  pendingDocuments,
  exigenciaGroups,
  reportMode,
  generatedAt,
  labels,
}: PendingDocumentsPdfTemplateProps) {
  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.colNum}>
        <Text style={styles.tableHeaderText}>#</Text>
      </View>
      <View style={styles.colName}>
        <Text style={styles.tableHeaderText}>{labels.document}</Text>
      </View>
      <View style={styles.colDeadline}>
        <Text style={[styles.tableHeaderText, { textAlign: "center" }]}>
          {labels.deadline}
        </Text>
      </View>
      <View style={styles.colStatus}>
        <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>
          {labels.status}
        </Text>
      </View>
    </View>
  )

  const renderDocList = (
    docs: PdfDocumentItem[],
    statusLabel: string,
    isExigencia: boolean,
    deadlineDate?: string,
    startIndex = 1
  ) =>
    docs.map((doc, i) => (
      <View
        key={doc.id}
        style={[styles.docRow, i % 2 === 1 ? styles.docRowAlt : {}]}
        wrap={false}
      >
        <View style={styles.colNum}>
          <Text style={styles.docNumber}>{startIndex + i}.</Text>
        </View>
        <View style={styles.colName}>
          <Text style={styles.docName}>{doc.name}</Text>
          {doc.versionNotes && (
            <Text style={{ fontSize: 7.5, color: "#718096", fontFamily: "Helvetica-Oblique", marginTop: 2 }}>
              {doc.versionNotes}
            </Text>
          )}
        </View>
        <View style={styles.colDeadline}>
          {deadlineDate && (
            <Text style={{ fontSize: 8, color: ORANGE, textAlign: "center" }}>
              {deadlineDate}
            </Text>
          )}
        </View>
        <View style={[styles.colStatus, { alignItems: "flex-end" }]}>
          <Text
            style={[
              styles.statusBadge,
              isExigencia ? styles.statusExigencia : styles.statusPending,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>
    ))

  const infoFields = [
    { label: labels.person, value: processInfo.personFullName },
    { label: labels.processType, value: processInfo.processTypeName },
    { label: labels.legalFramework, value: processInfo.legalFrameworkName },
    { label: labels.company, value: processInfo.companyApplicantName },
    { label: labels.referenceNumber, value: processInfo.referenceNumber },
    { label: labels.protocolNumber, value: processInfo.protocolNumber },
  ].filter((f) => f.value)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>CAS</Text>
          <Text style={styles.reportTitle}>{labels.reportTitle}</Text>
          <Text style={styles.generationDate}>
            {labels.generatedAt}: {generatedAt}
          </Text>
          {processInfo.dateProcess && (
            <Text
              style={[
                styles.generationDate,
                { fontFamily: "Helvetica-Bold", marginTop: 2 },
              ]}
            >
              {labels.dateProcess}: {processInfo.dateProcess}
            </Text>
          )}
        </View>
        <View style={styles.separator} />

        {/* Process Info */}
        <View style={styles.infoGrid}>
          {infoFields.map((f) => (
            <View key={f.label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{f.label}</Text>
              <Text style={styles.infoValue}>{f.value}</Text>
            </View>
          ))}
        </View>

        {/* Exigencia Sections */}
        {reportMode !== "pending" && exigenciaGroups.map((group, gi) => {
          const formattedDeadline = group.clientDeadlineDate
            ? group.clientDeadlineDate.split("-").reverse().join("/")
            : undefined
          return (
            <View key={gi}>
              <Text style={styles.sectionTitleExigencia}>
                {labels.exigenciaSection}
              </Text>
              <Text style={styles.exigenciaSubtitle}>{group.date}</Text>
              {renderTableHeader()}
              {renderDocList(
                group.documents,
                labels.exigenciaSection,
                true,
                formattedDeadline
              )}
            </View>
          )
        })}

        {/* Pending Documents */}
        {reportMode !== "exigencias" && pendingDocuments.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>{labels.pendingSectionTitle}</Text>
            {renderTableHeader()}
            {renderDocList(
              pendingDocuments,
              labels.pendingSection,
              false
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>CAS — {generatedAt}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${labels.page} ${pageNumber} ${labels.of} ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
