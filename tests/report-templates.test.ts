import assert from "node:assert/strict";
import test from "node:test";

import { buildReportVariableValues } from "../lib/report-templates/format-values";
import {
  extractReportVariableKeys,
  substituteReportVariables,
} from "../lib/report-templates/substitute";
import {
  buildIsolatedReportHtml,
  sanitizeReportHtmlForPdf,
} from "../lib/report-templates/html-to-pdf";
import {
  isReportVariableKey,
  REPORT_VARIABLES,
  variablesByGroup,
} from "../lib/report-templates/variables";

const i18n = {
  locale: "pt",
  tProcess: (key: string, values?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      processStatusCurrent: "Atual",
      processStatusPrevious: "Anterior",
      "qualificationOptions.superior": "Superior",
      "visaReceiptLocationOptions.abroad": "Exterior",
      "deadlineUnits.indeterminate": "Indeterminado",
      "relativeDate.year": "ano",
      "relativeDate.years": "anos",
      "relativeDate.month": "mês",
      "relativeDate.months": "meses",
      "relativeDate.day": "dia",
      "relativeDate.days": "dias",
      livesForYears: `mora há ${String(values?.count ?? "")} anos`,
      livesForMonths: `mora há ${String(values?.count ?? "")} meses`,
      livesForYearsAndMonths: `mora há ${String(values?.years ?? "")} anos e ${String(values?.months ?? "")} meses`,
      passportFileUploaded: "Upload realizado",
      passportFileNotUploaded: "Upload ainda não realizado",
    };
    return map[key] ?? key;
  },
  tPeople: (key: string, values?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      sexMale: "Masculino",
      maritalStatusMarried: "Casado(a)",
      yearsOld: `${String(values?.age ?? "")} anos`,
    };
    return map[key] ?? key;
  },
  tPassports: (key: string) => {
    const map: Record<string, string> = {
      statusValid: "Válido",
      statusExpiringSoon: "Expirando em Breve",
      statusExpired: "Expirado",
    };
    return map[key] ?? key;
  },
  tCommon: (key: string) => (key === "unknown" ? "Desconhecido" : key),
  translateCountry: (name: string) =>
    name === "United States" ? "Estados Unidos" : name,
};

test("variable catalog uses stable keys and UI-oriented groups", () => {
  assert.equal(isReportVariableKey("nationality"), true);
  assert.equal(isReportVariableKey("nationalityId"), false);
  assert.ok(variablesByGroup("process").some((item) => item.key === "legalFramework"));
  assert.ok(REPORT_VARIABLES.some((item) => item.key === "monthlyAmountToReceive"));
  assert.ok(REPORT_VARIABLES.some((item) => item.key === "passportNumber"));
  assert.ok(REPORT_VARIABLES.some((item) => item.key === "statusHistory"));
});

test("substitutes chips using client-facing keys, not database names", () => {
  const html =
    '<p>Nacionalidade: <span data-type="report-variable" data-key="nationality">Nacionalidade</span></p>';
  const result = substituteReportVariables(html, { nationality: "Estados Unidos" });
  assert.equal(result, "<p>Nacionalidade: Estados Unidos</p>");
  assert.equal(extractReportVariableKeys(html).includes("nationality"), true);
});

test("substitutes mustache tokens and escapes HTML in values", () => {
  const html = "<p>{{personName}} — {{cpf}}</p>";
  const result = substituteReportVariables(html, {
    personName: "Ana <script>",
    cpf: "039.867.637-24",
  });
  assert.equal(result, "<p>Ana &lt;script&gt; — 039.867.637-24</p>");
});

test("formats individual process fields with the labels shown to staff", () => {
  const values = buildReportVariableValues({
    process: {
      dateProcess: "2026-07-11",
      protocolNumber: "08228.027830/2026-79",
      qualification: "superior",
      professionalExperienceSince: "2015-07-01",
      visaReceiptLocation: "abroad",
      processStatus: "Atual",
      monthlyAmountToReceive: 14000,
      funcao: "",
      person: {
        givenNames: "Oran",
        middleName: "Alder",
        surname: "Mc Gee",
        cpf: "03986763724",
        sex: "Male",
        maritalStatus: "Married",
        birthDate: "1979-08-18",
        fatherName: "Gary W Mc Gee",
        motherName: "Sara Lee",
        nationality: { name: "United States" },
        birthCity: { name: "Fairbanks", state: { code: "AK" } },
      },
      userApplicant: {
        givenNames: "Murat",
        middleName: "Can",
        surname: "Ates",
        company: { name: "CADDELL CONSTRUCTION CO. (DE), LLC." },
      },
      cbo: {
        code: "1427-05",
        title: "Gerente de projetos e serviços de manutenção",
      },
      processType: { name: "Renovação de Residência" },
      legalFramework: { name: "Resolução Normativa 30/2018 (RN 02/2017)" },
      companyApplicant: { name: "CADDELL CONSTRUCTION CO. (DE), LLC." },
      collectiveProcess: { referenceNumber: "" },
      passport: {
        passportNumber: "C123456",
        issuingCountry: { name: "United States" },
        issueDate: "2020-01-15",
        expiryDate: "2030-01-15",
      },
    },
    statuses: [
      {
        date: "2026-07-11T14:32",
        changedAt: Date.parse("2026-07-11T14:32:00"),
        caseStatus: { name: "Em Trâmite" },
      },
      {
        date: "2026-07-10T09:00",
        changedAt: Date.parse("2026-07-10T09:00:00"),
        caseStatus: { name: "Em Preparação" },
      },
    ],
    passportFileUploaded: true,
    i18n,
  });

  assert.equal(values.personName, "Oran Alder Mc Gee");
  assert.equal(values.cpf, "039.867.637-24");
  assert.equal(values.nationality, "Estados Unidos");
  assert.equal(values.sex, "Masculino");
  assert.equal(values.maritalStatus, "Casado(a)");
  assert.match(values.birthDate, /18\/08\/1979/);
  assert.match(values.birthDate, /anos/);
  assert.equal(values.birthCity, "Fairbanks - AK");
  assert.equal(values.qualification, "Superior");
  assert.equal(values.processType, "Renovação de Residência");
  assert.equal(
    values.legalFramework,
    "Resolução Normativa 30/2018 (RN 02/2017)",
  );
  assert.match(values.userApplicant, /Murat Can Ates/);
  assert.match(values.cbo, /1427-05/);
  assert.equal(values.passportFile, "Upload realizado");
  assert.equal(values.issuingCountry, "Estados Unidos");
  assert.match(values.monthlyAmountToReceive, /14.000,00|14,000.00/);
  assert.match(values.statusHistory, /Em Trâmite/);
  assert.match(values.statusHistory, /Em Preparação/);
  assert.equal(values.currentStatus, "Em Trâmite");
});

test("PDF HTML isolation uses only hex colors and keeps report content", () => {
  const isolated = buildIsolatedReportHtml(
    '<p style="color: oklch(0.5 0.1 20)">Oran Alder Mc Gee</p>',
  );
  assert.match(isolated, /Oran Alder Mc Gee/);
  assert.match(isolated, /id="report-paper"/);
  assert.equal(isolated.includes("oklch"), false);
  assert.equal(
    sanitizeReportHtmlForPdf("color: oklch(0.21 0.03 256)"),
    "color: #111827",
  );
});
