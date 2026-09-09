import ptMessages from "../../messages/pt.json"
import { getOfficialCountryNameOrFallback } from "../data/country-official-names-pt"
import { formatFilenameDatePt, formatLongDatePt } from "./pt-dates"
import {
  REPORT_PLACEHOLDER,
  type CriminalBackgroundDeclaration,
  type CriminalBackgroundSource,
  type MissingFieldKey,
  type ReportRun,
} from "./types"

const COUNTRY_SHORT_PT = ptMessages.Countries.names as Record<string, string>

const MARITAL_STATUS_PT: Record<
  string,
  { Male: string; Female: string; default: string }
> = {
  Single: { Male: "solteiro", Female: "solteira", default: "solteiro" },
  Married: { Male: "casado", Female: "casada", default: "casado" },
  Divorced: { Male: "divorciado", Female: "divorciada", default: "divorciado" },
  Widowed: { Male: "viúvo", Female: "viúva", default: "viúvo" },
}

function isFemale(sex: string | null): boolean {
  return sex === "Female"
}

function valueOrPlaceholder(value: string | null | undefined): {
  text: string
  missing: boolean
} {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return { text: REPORT_PLACEHOLDER, missing: true }
  return { text: trimmed, missing: false }
}

function plain(text: string, extra?: { bold?: boolean }): ReportRun {
  return { text, bold: extra?.bold }
}

export function countryShortName(
  code: string | null | undefined,
  fallbackName: string | null | undefined,
): string {
  if (code && COUNTRY_SHORT_PT[code]) return COUNTRY_SHORT_PT[code]
  return fallbackName?.trim() ?? ""
}

export function genderedWord(
  male: string,
  female: string,
  sex: string | null | undefined,
): string {
  return isFemale(sex ?? null) ? female : male
}

export function maritalStatusPt(
  status: string | null | undefined,
  sex: string | null | undefined,
): string {
  if (!status) return ""
  const entry = MARITAL_STATUS_PT[status]
  if (!entry) return status.toLowerCase()
  if (sex === "Female") return entry.Female
  if (sex === "Male") return entry.Male
  return entry.default
}

export function toUpperName(name: string): string {
  return name.trim().toLocaleUpperCase("pt-BR")
}

function parentsClause(
  fatherName: string | null,
  motherName: string | null,
  sex: string | null,
): { runs: ReportRun[]; missing: MissingFieldKey[] } {
  const childWord = genderedWord("filho", "filha", sex)
  const father = fatherName?.trim() ?? ""
  const mother = motherName?.trim() ?? ""
  const missing: MissingFieldKey[] = []
  if (!father) missing.push("fatherName")
  if (!mother) missing.push("motherName")

  if (father && mother) {
    return {
      runs: [
        plain(`${childWord} de `),
        plain(`${toUpperName(father)} (pai)`),
        plain(" e de "),
        plain(`${toUpperName(mother)} (mãe)`),
      ],
      missing,
    }
  }

  if (father) {
    return {
      runs: [
        plain(`${childWord} de `),
        plain(`${toUpperName(father)} (pai)`),
        plain(" e de "),
        plain(`${REPORT_PLACEHOLDER} (mãe)`),
      ],
      missing,
    }
  }

  if (mother) {
    return {
      runs: [
        plain(`${childWord} de `),
        plain(`${REPORT_PLACEHOLDER} (pai)`),
        plain(" e de "),
        plain(`${toUpperName(mother)} (mãe)`),
      ],
      missing,
    }
  }

  return {
    runs: [
      plain(`${childWord} de `),
      plain(`${REPORT_PLACEHOLDER} (pai)`),
      plain(" e de "),
      plain(`${REPORT_PLACEHOLDER} (mãe)`),
    ],
    missing,
  }
}

export function filenameFromName(name: string, todayIso: string): string {
  const slug = toUpperName(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
  const safeName = slug || "candidato"
  return `${safeName} - aus ant crim - ${formatFilenameDatePt(todayIso)}`
}

export function buildCriminalBackgroundDeclaration(
  source: CriminalBackgroundSource,
): CriminalBackgroundDeclaration {
  const missingFields: MissingFieldKey[] = []

  const candidate = valueOrPlaceholder(source.candidateName)
  if (candidate.missing) missingFields.push("candidateName")
  const candidateName = candidate.missing
    ? REPORT_PLACEHOLDER
    : toUpperName(candidate.text)

  const nationality = countryShortName(
    source.nationalityCode,
    source.nationalityName,
  )
  if (!nationality) missingFields.push("nationality")

  const marital = maritalStatusPt(source.maritalStatus, source.sex)
  if (!marital) missingFields.push("maritalStatus")

  const birthDate = formatLongDatePt(source.birthDate)
  if (!birthDate) missingFields.push("birthDate")

  const parents = parentsClause(source.fatherName, source.motherName, source.sex)
  missingFields.push(...parents.missing)

  const passportNumber = source.passportNumber?.trim() ?? ""
  if (!passportNumber) missingFields.push("passportNumber")

  const issueDate = formatLongDatePt(source.passportIssueDate)
  if (!issueDate) missingFields.push("passportIssueDate")

  const issuingOfficial = getOfficialCountryNameOrFallback(
    source.issuingCountryCode ?? source.nationalityCode,
    source.issuingCountryName ?? source.nationalityName,
    source.issuingCountryFullName ?? source.nationalityFullName,
  )
  if (!issuingOfficial) missingFields.push("passportIssuingCountry")

  const expiryDate = formatLongDatePt(source.passportExpiryDate)
  if (!expiryDate) missingFields.push("passportExpiryDate")

  const legalFramework = source.legalFrameworkName?.trim() ?? ""
  if (!legalFramework) missingFields.push("legalFramework")
  const legalFrameworkText = legalFramework
    ? legalFramework.replace(/\s+$/u, "")
    : REPORT_PLACEHOLDER

  const bornWord = genderedWord("nascido", "nascida", source.sex)
  const holderWord = genderedWord("portador", "portadora", source.sex)

  const body: ReportRun[] = [
    plain("Eu, "),
    plain(candidateName, { bold: true }),
    plain(", nacional da "),
    plain(nationality || REPORT_PLACEHOLDER),
    plain(", "),
    plain(marital || REPORT_PLACEHOLDER),
    plain(`, ${bornWord} em `),
    plain(birthDate || REPORT_PLACEHOLDER),
    plain(", "),
    ...parents.runs,
    plain(`, ${holderWord} do passaporte de nº `),
    plain(passportNumber || REPORT_PLACEHOLDER),
    plain(" – emitido em "),
    plain(issueDate || REPORT_PLACEHOLDER),
    plain(" pela "),
    plain(issuingOfficial || REPORT_PLACEHOLDER),
    plain(", válido até "),
    plain(expiryDate || REPORT_PLACEHOLDER),
    plain(
      " – em atendimento ao disposto no Inciso XI do art. 1º da RN 01/2017 CNIg, ",
    ),
    plain("DECLARO", { bold: true }),
    plain(
      " sob as penas do art. 299 do Código Penal Brasileiro, que não possuo antecedentes criminais em qualquer país, nos 05 anos anteriores à data da solicitação de minha Autorização de Residência com base no ",
    ),
    plain(legalFrameworkText),
    plain(legalFrameworkText.endsWith(".") ? "" : "."),
  ]

  const todayLong = formatLongDatePt(source.todayIso) ?? source.todayIso
  const city = source.cityName?.trim() ?? ""
  const state = source.stateCode?.trim() ?? ""
  const locationPrefix =
    city && state ? `${city}/${state}` : city || ""

  if (!locationPrefix) missingFields.push("visaReceiptPlace")

  const locationDate: ReportRun[] = locationPrefix
    ? [plain(`${locationPrefix}, ${todayLong}.`)]
    : [plain(`${todayLong}.`)]

  return {
    title: "DECLARAÇÃO",
    recipientLines: [
      "Ao",
      "Ilmo. Sr. Coordenador-Geral de Imigração Laboral/CGIL/DEMIG/SNJ/MJSP",
    ],
    salutation: "Prezado Sr. Coordenador,",
    body,
    closingStatement:
      "Por ser a expressão da verdade, firmo a presente declaração.",
    petitionLines: ["Nestes termos,", "Pede deferimento."],
    locationDate,
    signatureName: candidateName,
    missingFields: [...new Set(missingFields)],
    filenameBase: filenameFromName(
      candidate.missing ? "candidato" : candidate.text,
      source.todayIso,
    ),
  }
}

export function declarationPlainText(
  report: CriminalBackgroundDeclaration,
): string {
  const body = report.body.map((run) => run.text).join("")
  const location = report.locationDate.map((run) => run.text).join("")
  return [
    report.title,
    "",
    ...report.recipientLines,
    "",
    report.salutation,
    "",
    body,
    "",
    report.closingStatement,
    "",
    ...report.petitionLines,
    "",
    location,
    "",
    report.signatureName,
  ].join("\n")
}
