export interface ProcessInfoForReport {
  personFullName?: string
  legalFrameworkName?: string
  processTypeName?: string
  companyApplicantName?: string
  referenceNumber?: string
  protocolNumber?: string
  dateProcess?: string
}

export interface PdfDocumentItem {
  id: string
  name: string
  isRequired: boolean
  isCompanyDocument: boolean
  responsibleParty?: string
  versionNotes?: string
}

export type PdfReportMode = "full" | "exigencias" | "pending"

export interface PdfExigenciaGroup {
  date: string
  statusName: string
  clientDeadlineDate?: string
  documents: PdfDocumentItem[]
}
