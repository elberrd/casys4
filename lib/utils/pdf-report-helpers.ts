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
}

export interface PdfExigenciaGroup {
  date: string
  statusName: string
  documents: PdfDocumentItem[]
}
