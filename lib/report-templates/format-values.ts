import { getOfficialCountryNameOrFallback } from "@/lib/data/country-official-names-pt";
import { calculateAge, formatDate } from "@/lib/format-field-value";
import { getPassportValidityStatus } from "@/lib/passport";
import {
  countryShortName,
  filenameFromName,
  genderedWord,
  maritalStatusPt,
  toUpperName,
} from "@/lib/process-reports/criminal-background-declaration";
import { formatFilenameDatePt, formatLongDatePt } from "@/lib/process-reports/pt-dates";
import { REPORT_PLACEHOLDER } from "@/lib/process-reports/types";
import { formatRelativeDate } from "@/lib/utils/date-utils";
import { formatCPF } from "@/lib/utils/document-masks";
import { getFullName } from "@/lib/utils/person-names";
import { formatResidenceDuration } from "@/lib/utils/residence-duration";
import { isCriminalBackgroundReportName, isProfessionalExperienceReportName } from "./built-in-templates";
import type { ReportVariableKey } from "./variables";

export interface ReportPersonName {
  givenNames: string;
  middleName?: string | null;
  surname?: string | null;
}

export interface ReportProcessSource {
  dateProcess?: string | null;
  funcao?: string | null;
  protocolNumber?: string | null;
  qualification?: string | null;
  professionalExperienceSince?: string | null;
  cboActivities?: string | null;
  visaReceiptLocation?: "brazil" | "abroad" | string | null;
  residenceCountryName?: string | null;
  residenceCity?: string | null;
  residenceSince?: string | null;
  residenceAddressAbroad?: string | null;
  consularPost?: string | null;
  professionalExperience?: string | null;
  deadlineUnit?: string | null;
  deadlineQuantity?: number | null;
  deadlineDate?: string | null;
  processStatus?: "Atual" | "Anterior" | string | null;
  lastSalaryCurrency?: string | null;
  lastSalaryAmount?: number | null;
  exchangeRateToBRL?: number | null;
  salaryInBRL?: number | null;
  monthlyAmountToReceive?: number | null;
  person?:
    | (ReportPersonName & {
        cpf?: string | null;
        sex?: string | null;
        maritalStatus?: string | null;
        birthDate?: string | null;
        fatherName?: string | null;
        motherName?: string | null;
        email?: string | null;
        profession?: string | null;
        nationality?: {
          name?: string | null;
          code?: string | null;
          fullName?: string | null;
        } | null;
        birthCity?: {
          name?: string | null;
          state?: { code?: string | null } | null;
        } | null;
      })
    | null;
  userApplicant?:
    | (ReportPersonName & {
        company?: { name?: string | null } | null;
      })
    | null;
  cbo?: {
    code?: string | null;
    title?: string | null;
    activity?: string | null;
  } | null;
  processType?: { name?: string | null } | null;
  legalFramework?: { name?: string | null } | null;
  companyApplicant?: {
    name?: string | null;
    groupName?: string | null;
    city?: { name?: string | null } | null;
    state?: { code?: string | null; name?: string | null } | null;
  } | null;
  consulate?: { city?: { name?: string | null } | null } | null;
  collectiveProcess?: { referenceNumber?: string | null } | null;
  passport?: {
    passportNumber?: string | null;
    issueDate?: string | null;
    expiryDate?: string | null;
    issuingCountry?: {
      name?: string | null;
      code?: string | null;
      fullName?: string | null;
    } | null;
    storageId?: unknown;
    fileUrl?: string | null;
  } | null;
}

export interface ReportStatusEntry {
  date?: string | null;
  changedAt: number;
  statusName?: string | null;
  caseStatus?: {
    name?: string | null;
    nameEn?: string | null;
  } | null;
}

export interface ReportI18n {
  locale: string;
  tProcess: (key: string, values?: Record<string, unknown>) => string;
  tPeople: (key: string, values?: Record<string, unknown>) => string;
  tPassports: (key: string) => string;
  tCommon: (key: string) => string;
  translateCountry: (name: string) => string;
}

function display(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function formatMoney(amount: number, locale: string): string {
  return amount.toLocaleString(locale === "en" ? "en-US" : "pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function capitalizeToken(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDeadline(
  process: ReportProcessSource,
  i18n: ReportI18n,
): string {
  if (process.deadlineUnit === "indeterminate") {
    return i18n.tProcess("deadlineUnits.indeterminate");
  }

  if (process.deadlineQuantity && process.deadlineUnit) {
    const quantity = process.deadlineQuantity;
    const unit = process.deadlineUnit;
    const unitLabel =
      unit === "years"
        ? quantity === 1
          ? i18n.locale === "en"
            ? "year"
            : "ano"
          : i18n.locale === "en"
            ? "years"
            : "anos"
        : unit === "months"
          ? quantity === 1
            ? i18n.locale === "en"
              ? "month"
              : "mês"
            : i18n.locale === "en"
              ? "months"
              : "meses"
          : quantity === 1
            ? i18n.locale === "en"
              ? "day"
              : "dia"
            : i18n.locale === "en"
              ? "days"
              : "dias";
    return `${quantity} ${unitLabel}`;
  }

  return display(process.deadlineDate);
}

function formatResidence(process: ReportProcessSource, i18n: ReportI18n): string {
  if (process.visaReceiptLocation !== "abroad") return "";

  const place = [process.residenceCity, process.residenceCountryName]
    .filter(Boolean)
    .join(", ");
  const duration = process.residenceSince
    ? formatResidenceDuration(process.residenceSince, (key, vars) =>
        i18n.tProcess(key, vars as Record<string, unknown> | undefined),
      )
    : "";

  if (place && duration) return `${place} (${duration})`;
  return place || duration;
}

function formatExperienceSince(
  isoDate: string,
  i18n: ReportI18n,
): string {
  const exactDate = formatDate(isoDate, i18n.locale);
  const relativeDate = formatRelativeDate(isoDate, {
    year: i18n.tProcess("relativeDate.year"),
    years: i18n.tProcess("relativeDate.years"),
    month: i18n.tProcess("relativeDate.month"),
    months: i18n.tProcess("relativeDate.months"),
    day: i18n.tProcess("relativeDate.day"),
    days: i18n.tProcess("relativeDate.days"),
  });
  return relativeDate ? `${exactDate} (${relativeDate})` : exactDate;
}

function formatStatusDateTime(
  status: ReportStatusEntry,
  i18n: ReportI18n,
): string {
  const raw = status.date;
  if (raw) {
    const hasTime = raw.includes("T");
    const parsed = new Date(hasTime ? raw : `${raw}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat(i18n.locale === "en" ? "en-US" : "pt-BR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        ...(hasTime
          ? { hour: "2-digit", minute: "2-digit" }
          : {}),
      }).format(parsed);
    }
    return raw;
  }

  return new Intl.DateTimeFormat(i18n.locale === "en" ? "en-US" : "pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(status.changedAt));
}

function statusLabel(status: ReportStatusEntry, locale: string): string {
  if (locale === "en") {
    return (
      status.caseStatus?.nameEn?.trim() ||
      status.caseStatus?.name?.trim() ||
      status.statusName?.trim() ||
      ""
    );
  }
  return (
    status.caseStatus?.name?.trim() ||
    status.statusName?.trim() ||
    ""
  );
}

function formatSex(sex: string | null | undefined, i18n: ReportI18n): string {
  if (!sex) return "";
  const key = `sex${capitalizeToken(sex)}`;
  const translated = i18n.tPeople(key);
  return translated === key ? sex : translated;
}

function formatMaritalStatus(
  maritalStatus: string | null | undefined,
  i18n: ReportI18n,
): string {
  if (!maritalStatus) return "";
  const key = `maritalStatus${capitalizeToken(maritalStatus)}`;
  const translated = i18n.tPeople(key);
  return translated === key ? maritalStatus : translated;
}

export interface ReportFormatExtras {
  todayIso?: string;
  visaReceiptCityName?: string | null;
  visaReceiptStateCode?: string | null;
  nationalityCode?: string | null;
  nationalityName?: string | null;
  nationalityFullName?: string | null;
  issuingCountryCode?: string | null;
  issuingCountryName?: string | null;
  issuingCountryFullName?: string | null;
}

function declarationText(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : REPORT_PLACEHOLDER;
}

function stripTrailingPeriod(value: string): string {
  return value.replace(/\s+$/u, "").replace(/\.+$/u, "");
}

function formatCompanyCity(process: ReportProcessSource): string {
  const cityName = process.companyApplicant?.city?.name?.trim() ?? "";
  if (!cityName) return "";
  const stateCode =
    process.companyApplicant?.state?.code?.trim() ||
    process.companyApplicant?.state?.name?.trim() ||
    "";
  return stateCode ? `${cityName}/${stateCode}` : cityName;
}

function formatCompanyEmploymentPlace(process: ReportProcessSource): string {
  const name = process.companyApplicant?.name?.trim() ?? "";
  if (!name) return "";
  const city = formatCompanyCity(process);
  const group = process.companyApplicant?.groupName?.trim() ?? "";
  let result = name;
  if (city) result += `, ${city}`;
  if (group) result += ` que pertence ao grupo de empresas ${group}`;
  return result;
}

export function suggestedReportFilename(args: {
  templateName: string;
  personName: string;
  todayIso: string;
}): string {
  if (isCriminalBackgroundReportName(args.templateName)) {
    return filenameFromName(args.personName || "candidato", args.todayIso);
  }
  if (isProfessionalExperienceReportName(args.templateName)) {
    const slug = toUpperName(args.personName || "candidato")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return `${slug || "candidato"} - exp prof - ${formatFilenameDatePt(args.todayIso)}`;
  }
  return args.templateName;
}

export function buildReportVariableValues(args: {
  process: ReportProcessSource;
  statuses: readonly ReportStatusEntry[];
  passportFileUploaded: boolean;
  i18n: ReportI18n;
  extras?: ReportFormatExtras;
}): Record<ReportVariableKey, string> {
  const { process, statuses, passportFileUploaded, i18n, extras } = args;
  const person = process.person;
  const passport = process.passport;

  const personName = person ? getFullName(person) : "";
  const userApplicant = process.userApplicant
    ? process.userApplicant.company?.name
      ? `${getFullName(process.userApplicant)} - ${process.userApplicant.company.name}`
      : getFullName(process.userApplicant)
    : "";
  const userApplicantName = process.userApplicant
    ? getFullName(process.userApplicant)
    : "";

  const cbo = process.cbo
    ? [process.cbo.code, process.cbo.title].filter(Boolean).join(" - ")
    : "";
  const cboTitle = display(process.cbo?.title);
  const cboTitleUpper = cboTitle ? toUpperName(cboTitle) : "";
  const companyCity = formatCompanyCity(process);
  const companyGroup = display(process.companyApplicant?.groupName);
  const companyCityClause = companyCity ? `, ${companyCity}` : "";
  const companyGroupClause = companyGroup
    ? ` que pertence ao grupo de empresas ${companyGroup}`
    : "";
  const companyEmploymentPlace = formatCompanyEmploymentPlace(process);
  const professionalExperienceSinceLong = process.professionalExperienceSince
    ? formatLongDatePt(process.professionalExperienceSince) ?? ""
    : "";
  const atividadeCBO = display(process.cboActivities);

  const processStatus =
    process.processStatus === "Anterior"
      ? i18n.tProcess("processStatusPrevious")
      : i18n.tProcess("processStatusCurrent");

  const qualification = process.qualification
    ? i18n.tProcess(`qualificationOptions.${process.qualification}`)
    : "";

  const visaReceiptLocation = process.visaReceiptLocation
    ? i18n.tProcess(
        `visaReceiptLocationOptions.${process.visaReceiptLocation}`,
      )
    : "";

  const birthDate = person?.birthDate
    ? (() => {
        const formatted = formatDate(person.birthDate, i18n.locale);
        const age = calculateAge(person.birthDate);
        return age !== null
          ? `${formatted} - ${i18n.tPeople("yearsOld", { age })}`
          : formatted;
      })()
    : "";

  const birthCity = person?.birthCity?.name
    ? `${person.birthCity.name}${
        person.birthCity.state?.code ? ` - ${person.birthCity.state.code}` : ""
      }`
    : "";

  const passportValidity = getPassportValidityStatus(passport?.expiryDate);
  const passportStatus = passport
    ? passportValidity
      ? i18n.tPassports(`status${passportValidity.replace(" ", "")}`)
      : i18n.tCommon("unknown")
    : "";

  const currentStatus = statuses[0] ?? null;

  const statusHistory = statuses
    .map((status) => {
      const label = statusLabel(status, i18n.locale);
      const when = formatStatusDateTime(status, i18n);
      return [when, label].filter(Boolean).join(" - ");
    })
    .filter(Boolean)
    .join("\n");

  const sex = person?.sex ?? null;
  const nationalityCode =
    extras?.nationalityCode ?? person?.nationality?.code ?? null;
  const nationalityName =
    extras?.nationalityName ?? person?.nationality?.name ?? null;
  const nationalityFullName =
    extras?.nationalityFullName ?? person?.nationality?.fullName ?? null;
  const issuingCountryCode =
    extras?.issuingCountryCode ??
    passport?.issuingCountry?.code ??
    nationalityCode;
  const issuingCountryName =
    extras?.issuingCountryName ??
    passport?.issuingCountry?.name ??
    nationalityName;
  const issuingCountryFullName =
    extras?.issuingCountryFullName ??
    passport?.issuingCountry?.fullName ??
    nationalityFullName;

  const personNameUpper = personName
    ? toUpperName(personName)
    : REPORT_PLACEHOLDER;
  const nationalityShort = declarationText(
    countryShortName(nationalityCode, nationalityName),
  );
  const maritalStatusText = declarationText(
    maritalStatusPt(person?.maritalStatus, sex),
  );
  const birthDateLong = declarationText(formatLongDatePt(person?.birthDate));
  const fatherNameUpper = person?.fatherName?.trim()
    ? toUpperName(person.fatherName)
    : REPORT_PLACEHOLDER;
  const motherNameUpper = person?.motherName?.trim()
    ? toUpperName(person.motherName)
    : REPORT_PLACEHOLDER;
  const issueDateLong = declarationText(formatLongDatePt(passport?.issueDate));
  const expiryDateLong = declarationText(formatLongDatePt(passport?.expiryDate));
  const issuingCountryOfficial = declarationText(
    getOfficialCountryNameOrFallback(
      issuingCountryCode,
      issuingCountryName,
      issuingCountryFullName,
    ),
  );
  const legalFrameworkRaw = display(process.legalFramework?.name);
  const legalFrameworkPlain = legalFrameworkRaw
    ? stripTrailingPeriod(legalFrameworkRaw)
    : REPORT_PLACEHOLDER;

  const cityName = extras?.visaReceiptCityName?.trim() ?? "";
  const stateCode = extras?.visaReceiptStateCode?.trim() ?? "";
  const visaReceiptPlace =
    cityName && stateCode
      ? `${cityName}/${stateCode}`
      : cityName || "";
  const todayLongRaw = extras?.todayIso
    ? formatLongDatePt(extras.todayIso) ?? extras.todayIso
    : "";
  const locationDate = todayLongRaw
    ? visaReceiptPlace
      ? `${visaReceiptPlace}, ${todayLongRaw}.`
      : `${todayLongRaw}.`
    : REPORT_PLACEHOLDER;

  return {
    personName: display(personName),
    referenceNumber: display(process.collectiveProcess?.referenceNumber),
    processStatus,
    dateProcess: process.dateProcess
      ? formatDate(process.dateProcess, i18n.locale)
      : "",
    userApplicant: display(userApplicant),
    cbo: display(cbo),
    funcao: display(process.funcao),
    processType: display(process.processType?.name),
    legalFramework: display(process.legalFramework?.name),
    companyApplicant: display(process.companyApplicant?.name),
    consulate: display(process.consulate?.city?.name),
    deadlineDate: formatDeadline(process, i18n),
    protocolNumber: display(process.protocolNumber),
    qualification: qualification === `qualificationOptions.${process.qualification}`
      ? display(process.qualification)
      : qualification,
    professionalExperienceSince: process.professionalExperienceSince
      ? formatExperienceSince(process.professionalExperienceSince, i18n)
      : "",
    visaReceiptLocation,
    residence: formatResidence(process, i18n),
    consularPost: display(process.consularPost),
    residenceAddressAbroad: display(process.residenceAddressAbroad),
    professionalExperience: display(process.professionalExperience),
    cpf: person?.cpf ? formatCPF(person.cpf) : "",
    nationality: person?.nationality?.name
      ? i18n.translateCountry(person.nationality.name)
      : "",
    sex: formatSex(person?.sex, i18n),
    maritalStatus: formatMaritalStatus(person?.maritalStatus, i18n),
    birthDate,
    birthCity,
    fatherName: display(person?.fatherName),
    motherName: display(person?.motherName),
    email: display(person?.email),
    profession: display(person?.profession),
    lastSalaryAmount:
      process.lastSalaryAmount != null
        ? `${process.lastSalaryCurrency ? `${process.lastSalaryCurrency} ` : ""}${formatMoney(process.lastSalaryAmount, i18n.locale)}`
        : "",
    exchangeRateToBRL:
      process.exchangeRateToBRL != null
        ? formatMoney(process.exchangeRateToBRL, i18n.locale)
        : "",
    salaryInBRL:
      process.salaryInBRL != null
        ? `R$ ${formatMoney(process.salaryInBRL, i18n.locale)}`
        : "",
    monthlyAmountToReceive:
      process.monthlyAmountToReceive != null
        ? `R$ ${formatMoney(process.monthlyAmountToReceive, i18n.locale)}`
        : "",
    passportNumber: declarationText(passport?.passportNumber),
    issuingCountry: passport?.issuingCountry?.name
      ? i18n.translateCountry(passport.issuingCountry.name)
      : "",
    issueDate: passport?.issueDate
      ? formatDate(passport.issueDate, i18n.locale)
      : "",
    expiryDate: passport?.expiryDate
      ? formatDate(passport.expiryDate, i18n.locale)
      : "",
    passportStatus,
    passportFile: passport
      ? passportFileUploaded
        ? i18n.tProcess("passportFileUploaded")
        : i18n.tProcess("passportFileNotUploaded")
      : "",
    statusHistory,
    currentStatus: currentStatus ? statusLabel(currentStatus, i18n.locale) : "",
    currentStatusDateTime: currentStatus
      ? formatStatusDateTime(currentStatus, i18n)
      : "",
    personNameUpper,
    nationalityShort,
    maritalStatusText,
    bornWord: genderedWord("nascido", "nascida", sex),
    childWord: genderedWord("filho", "filha", sex),
    holderWord: genderedWord("portador", "portadora", sex),
    birthDateLong,
    fatherNameUpper,
    motherNameUpper,
    issueDateLong,
    expiryDateLong,
    issuingCountryOfficial,
    legalFrameworkPlain,
    visaReceiptPlace,
    todayLong: todayLongRaw || REPORT_PLACEHOLDER,
    locationDate,
    atividadeCBO,
    cboTitle,
    cboTitleUpper,
    professionalExperienceSinceLong,
    companyGroup,
    companyGroupClause,
    companyCity,
    companyCityClause,
    companyEmploymentPlace,
    userApplicantName: display(userApplicantName),
    srPhrase: genderedWord("o Sr.", "a Sra.", sex),
    employeeWord: genderedWord("funcionário", "funcionária", sex),
  };
}
