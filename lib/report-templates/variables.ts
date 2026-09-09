export const REPORT_VARIABLE_GROUP_IDS = [
  "header",
  "process",
  "person",
  "passport",
  "history",
  "document",
] as const;

export type ReportVariableGroupId = (typeof REPORT_VARIABLE_GROUP_IDS)[number];

export const REPORT_VARIABLE_KEYS = [
  "personName",
  "referenceNumber",
  "processStatus",
  "dateProcess",
  "userApplicant",
  "cbo",
  "funcao",
  "processType",
  "legalFramework",
  "companyApplicant",
  "consulate",
  "deadlineDate",
  "protocolNumber",
  "qualification",
  "professionalExperienceSince",
  "visaReceiptLocation",
  "residence",
  "consularPost",
  "residenceAddressAbroad",
  "professionalExperience",
  "cpf",
  "nationality",
  "sex",
  "maritalStatus",
  "birthDate",
  "birthCity",
  "fatherName",
  "motherName",
  "email",
  "profession",
  "lastSalaryAmount",
  "exchangeRateToBRL",
  "salaryInBRL",
  "monthlyAmountToReceive",
  "passportNumber",
  "issuingCountry",
  "issueDate",
  "expiryDate",
  "passportStatus",
  "passportFile",
  "statusHistory",
  "currentStatus",
  "currentStatusDateTime",
  "personNameUpper",
  "nationalityShort",
  "maritalStatusText",
  "bornWord",
  "childWord",
  "holderWord",
  "birthDateLong",
  "fatherNameUpper",
  "motherNameUpper",
  "issueDateLong",
  "expiryDateLong",
  "issuingCountryOfficial",
  "legalFrameworkPlain",
  "visaReceiptPlace",
  "todayLong",
  "locationDate",
  "atividadeCBO",
  "cboTitle",
  "cboTitleUpper",
  "professionalExperienceSinceLong",
  "companyGroup",
  "companyGroupClause",
  "companyCity",
  "companyCityClause",
  "companyEmploymentPlace",
  "userApplicantName",
  "srPhrase",
  "employeeWord",
] as const;

export type ReportVariableKey = (typeof REPORT_VARIABLE_KEYS)[number];

export interface ReportVariableDefinition {
  key: ReportVariableKey;
  group: ReportVariableGroupId;
}

export const REPORT_VARIABLES: readonly ReportVariableDefinition[] = [
  { key: "personName", group: "header" },
  { key: "referenceNumber", group: "header" },
  { key: "processStatus", group: "header" },
  { key: "dateProcess", group: "process" },
  { key: "userApplicant", group: "process" },
  { key: "cbo", group: "process" },
  { key: "funcao", group: "process" },
  { key: "processType", group: "process" },
  { key: "legalFramework", group: "process" },
  { key: "companyApplicant", group: "process" },
  { key: "consulate", group: "process" },
  { key: "deadlineDate", group: "process" },
  { key: "protocolNumber", group: "process" },
  { key: "qualification", group: "process" },
  { key: "professionalExperienceSince", group: "process" },
  { key: "visaReceiptLocation", group: "process" },
  { key: "residence", group: "process" },
  { key: "consularPost", group: "process" },
  { key: "residenceAddressAbroad", group: "process" },
  { key: "professionalExperience", group: "process" },
  { key: "cpf", group: "person" },
  { key: "nationality", group: "person" },
  { key: "sex", group: "person" },
  { key: "maritalStatus", group: "person" },
  { key: "birthDate", group: "person" },
  { key: "birthCity", group: "person" },
  { key: "fatherName", group: "person" },
  { key: "motherName", group: "person" },
  { key: "email", group: "person" },
  { key: "profession", group: "person" },
  { key: "lastSalaryAmount", group: "person" },
  { key: "exchangeRateToBRL", group: "person" },
  { key: "salaryInBRL", group: "person" },
  { key: "monthlyAmountToReceive", group: "person" },
  { key: "passportNumber", group: "passport" },
  { key: "issuingCountry", group: "passport" },
  { key: "issueDate", group: "passport" },
  { key: "expiryDate", group: "passport" },
  { key: "passportStatus", group: "passport" },
  { key: "passportFile", group: "passport" },
  { key: "statusHistory", group: "history" },
  { key: "currentStatus", group: "history" },
  { key: "currentStatusDateTime", group: "history" },
  { key: "personNameUpper", group: "document" },
  { key: "nationalityShort", group: "document" },
  { key: "maritalStatusText", group: "document" },
  { key: "bornWord", group: "document" },
  { key: "childWord", group: "document" },
  { key: "holderWord", group: "document" },
  { key: "birthDateLong", group: "document" },
  { key: "fatherNameUpper", group: "document" },
  { key: "motherNameUpper", group: "document" },
  { key: "issueDateLong", group: "document" },
  { key: "expiryDateLong", group: "document" },
  { key: "issuingCountryOfficial", group: "document" },
  { key: "legalFrameworkPlain", group: "document" },
  { key: "visaReceiptPlace", group: "document" },
  { key: "todayLong", group: "document" },
  { key: "locationDate", group: "document" },
  { key: "atividadeCBO", group: "document" },
  { key: "cboTitle", group: "document" },
  { key: "cboTitleUpper", group: "document" },
  { key: "professionalExperienceSinceLong", group: "document" },
  { key: "companyGroup", group: "document" },
  { key: "companyGroupClause", group: "document" },
  { key: "companyCity", group: "document" },
  { key: "companyCityClause", group: "document" },
  { key: "companyEmploymentPlace", group: "document" },
  { key: "userApplicantName", group: "document" },
  { key: "srPhrase", group: "document" },
  { key: "employeeWord", group: "document" },
];

export function isReportVariableKey(value: string): value is ReportVariableKey {
  return (REPORT_VARIABLE_KEYS as readonly string[]).includes(value);
}

/** Human labels and spaced names that map onto camelCase keys. */
const REPORT_VARIABLE_KEY_ALIASES: Record<string, ReportVariableKey> = {
  "atividade cbo": "atividadeCBO",
};

/** Resolves a chip/`{{token}}` name, including aliases like `atividade CBO`. */
export function resolveReportVariableKey(
  raw: string,
): ReportVariableKey | null {
  const key = raw.trim();
  if (isReportVariableKey(key)) return key;
  return REPORT_VARIABLE_KEY_ALIASES[key.toLowerCase()] ?? null;
}

/** Optional chips may be blank without blocking generation (e.g. no corporate group). */
export const OPTIONAL_REPORT_VARIABLE_KEYS = [
  "companyGroup",
  "companyGroupClause",
  "companyCity",
  "companyCityClause",
] as const;

export function isOptionalReportVariableKey(value: string): boolean {
  return (OPTIONAL_REPORT_VARIABLE_KEYS as readonly string[]).includes(value);
}

export function variablesByGroup(
  group: ReportVariableGroupId,
): readonly ReportVariableDefinition[] {
  return REPORT_VARIABLES.filter((variable) => variable.group === group);
}
