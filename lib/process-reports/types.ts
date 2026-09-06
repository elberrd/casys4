export const REPORT_PLACEHOLDER = "______"

export const MISSING_FIELD_KEYS = [
  "candidateName",
  "nationality",
  "maritalStatus",
  "birthDate",
  "fatherName",
  "motherName",
  "passportNumber",
  "passportIssueDate",
  "passportIssuingCountry",
  "passportExpiryDate",
  "legalFramework",
] as const

export type MissingFieldKey = (typeof MISSING_FIELD_KEYS)[number]

export type ReportRun = {
  text: string
  highlight?: boolean
  bold?: boolean
}

export type CriminalBackgroundSource = {
  candidateName: string
  sex: string | null
  maritalStatus: string | null
  birthDate: string | null
  fatherName: string | null
  motherName: string | null
  nationalityName: string | null
  nationalityCode: string | null
  nationalityFullName: string | null
  passportNumber: string | null
  passportIssueDate: string | null
  passportExpiryDate: string | null
  issuingCountryName: string | null
  issuingCountryCode: string | null
  issuingCountryFullName: string | null
  legalFrameworkName: string | null
  cityName: string | null
  stateCode: string | null
  todayIso: string
}

export type CriminalBackgroundDeclaration = {
  title: string
  recipientLines: string[]
  salutation: string
  body: ReportRun[]
  closingLines: string[]
  locationDate: ReportRun[]
  signatureName: string
  missingFields: MissingFieldKey[]
  filenameBase: string
}

export const PROCESS_REPORT_TYPES = [
  "criminalBackgroundDeclaration",
] as const

export type ProcessReportType = (typeof PROCESS_REPORT_TYPES)[number]
