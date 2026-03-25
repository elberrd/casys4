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
  exigenciaReason?: string
}

export type PdfReportMode = "full" | "exigencias" | "exigencias_atuais" | "pending"

export interface PdfDocumentWithConditions {
  id: string
  name: string
  status: string
  statusLabel: string
  isCompanyDocument: boolean
  unfulfilledConditions: string[]
}

export interface PdfExigenciaGroup {
  date: string
  statusName: string
  clientDeadlineDate?: string
  documents: PdfDocumentItem[]
}
