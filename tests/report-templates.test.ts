import assert from "node:assert/strict";
import test from "node:test";

import {
  CRIMINAL_BACKGROUND_REPORT_HTML,
  CRIMINAL_BACKGROUND_REPORT_NAME,
  PROFESSIONAL_EXPERIENCE_REPORT_HTML,
  PROFESSIONAL_EXPERIENCE_REPORT_NAME,
} from "../lib/report-templates/built-in-templates";
import {
  buildReportVariableValues,
  suggestedReportFilename,
} from "../lib/report-templates/format-values";
import { htmlToDocxBlob } from "../lib/report-templates/html-to-docx";
import {
  buildIsolatedReportHtml,
  sanitizeReportHtmlForPdf,
} from "../lib/report-templates/html-to-pdf";
import JSZip from "jszip";
import {
  countReportPages,
  countReportContentPages,
  fitReportZoom,
  nextReportZoomLevel,
  reportPageStackHeightMm,
  REPORT_PAGE_WIDTH_PX,
} from "../lib/report-templates/page-layout";
import {
  extractReportVariableKeys,
  missingUsedReportVariables,
  substituteReportVariables,
} from "../lib/report-templates/substitute";
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
  assert.ok(REPORT_VARIABLES.some((item) => item.key === "personNameUpper"));
  assert.ok(REPORT_VARIABLES.some((item) => item.key === "locationDate"));
  assert.ok(REPORT_VARIABLES.some((item) => item.key === "atividadeCBO"));
  assert.ok(REPORT_VARIABLES.some((item) => item.key === "companyEmploymentPlace"));
});

test("resolves the spaced alias atividade CBO to the process field", () => {
  const html =
    '<p><span data-type="report-variable" data-key="atividade CBO">Atividade CBO</span> {{atividade CBO}}</p>';
  const result = substituteReportVariables(html, {
    atividadeCBO: "i) Selecionar materiais",
  });
  assert.equal(
    result,
    "<p>i) Selecionar materiais i) Selecionar materiais</p>",
  );
  assert.deepEqual(extractReportVariableKeys(html), ["atividadeCBO"]);
});

test("substitutes chips using client-facing keys, not database names", () => {
  const html =
    '<p>Nacionalidade: <span data-type="report-variable" data-key="nationality">Nacionalidade</span></p>';
  const result = substituteReportVariables(html, { nationality: "Estados Unidos" });
  assert.equal(result, "<p>Nacionalidade: Estados Unidos</p>");
  assert.equal(extractReportVariableKeys(html).includes("nationality"), true);
});

test("keeps bold, italic and inline styles when filling a variable chip", () => {
  const html =
    '<p><strong><em><span data-type="report-variable" data-key="personName" style="font-size: 20px; color: #111827">Nome do indivíduo</span></em></strong></p>';
  const result = substituteReportVariables(html, {
    personName: "Oran Alder Mc Gee",
  });
  assert.equal(
    result,
    '<p><strong><em><span style="font-size: 20px; color: #111827">Oran Alder Mc Gee</span></em></strong></p>',
  );
});

test("applies chip data-bold and data-italic to the filled value", () => {
  const html =
    '<p>Nome: <span data-type="report-variable" data-key="personName" data-bold="true" data-italic="true">Nome do indivíduo</span></p>';
  const result = substituteReportVariables(html, {
    personName: "Oran Alder Mc Gee",
  });
  assert.equal(
    result,
    "<p>Nome: <strong><em>Oran Alder Mc Gee</em></strong></p>",
  );
});

test("applies chip underline and strike to the filled value", () => {
  const html =
    '<p><span data-type="report-variable" data-key="cpf" data-underline="true" data-strike="true">CPF</span></p>';
  const result = substituteReportVariables(html, {
    cpf: "039.867.637-24",
  });
  assert.equal(result, "<p><u><s>039.867.637-24</s></u></p>");
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

test("counts A4 pages from the paper aspect ratio", () => {
  assert.equal(countReportPages(1123, 794), 1);
  assert.equal(countReportPages(1500, 794), 2);
  assert.equal(countReportPages(2300, 794), 3);
  assert.equal(countReportPages(0, 794), 1);
});

test("counts pages from content height inside the printable area", () => {
  assert.equal(countReportContentPages(257, 257), 1);
  assert.equal(countReportContentPages(400, 257), 2);
  assert.equal(countReportContentPages(0, 257), 1);
});

test("stacks A4 sheets with a gap like Word print layout", () => {
  assert.equal(reportPageStackHeightMm(1), 297);
  assert.equal(reportPageStackHeightMm(2), 297 * 2 + 12);
  assert.equal(reportPageStackHeightMm(3), 297 * 3 + 24);
});

test("steps zoom between preset Word-like levels", () => {
  assert.equal(nextReportZoomLevel(100, 1), 125);
  assert.equal(nextReportZoomLevel(100, -1), 90);
  assert.equal(nextReportZoomLevel(50, -1), 50);
  assert.equal(nextReportZoomLevel(150, 1), 150);
  assert.equal(nextReportZoomLevel(83, 1), 90);
  assert.equal(nextReportZoomLevel(83, -1), 75);
});

test("fits zoom to the available desk width", () => {
  assert.equal(fitReportZoom(REPORT_PAGE_WIDTH_PX + 64), 100);
  assert.equal(fitReportZoom(200), 50);
  assert.equal(fitReportZoom(5000), 150);
});

test("formats declaration variables in Portuguese regardless of UI locale", () => {
  const values = buildReportVariableValues({
    process: {
      legalFramework: { name: "Resolução Normativa 30/2018 (RN 02/2017)." },
      person: {
        givenNames: "Oran",
        middleName: "Alder",
        surname: "Mc Gee",
        sex: "Male",
        maritalStatus: "Married",
        birthDate: "1979-08-18",
        fatherName: "Gary W Mc Gee",
        motherName: "Sara Lee",
        nationality: { name: "United States", code: "US" },
      },
      passport: {
        passportNumber: "A54269887",
        issuingCountry: { name: "United States", code: "US" },
        issueDate: "2024-11-21",
        expiryDate: "2034-11-20",
      },
    },
    statuses: [],
    passportFileUploaded: false,
    i18n,
    extras: {
      todayIso: "2026-09-08",
      visaReceiptCityName: null,
      visaReceiptStateCode: null,
      nationalityCode: "US",
      nationalityName: "United States",
      issuingCountryCode: "US",
      issuingCountryName: "United States",
      issuingCountryFullName: "Estados Unidos da América",
    },
  });

  assert.equal(values.personNameUpper, "ORAN ALDER MC GEE");
  assert.equal(values.nationalityShort, "Estados Unidos");
  assert.equal(values.maritalStatusText, "casado");
  assert.equal(values.bornWord, "nascido");
  assert.equal(values.childWord, "filho");
  assert.equal(values.holderWord, "portador");
  assert.equal(values.birthDateLong, "18 de agosto de 1979");
  assert.equal(values.fatherNameUpper, "GARY W MC GEE");
  assert.equal(values.motherNameUpper, "SARA LEE");
  assert.equal(values.issueDateLong, "21 de novembro de 2024");
  assert.equal(values.expiryDateLong, "20 de novembro de 2034");
  assert.equal(values.issuingCountryOfficial, "Estados Unidos da América");
  assert.equal(
    values.legalFrameworkPlain,
    "Resolução Normativa 30/2018 (RN 02/2017)",
  );
  assert.equal(values.visaReceiptPlace, "");
  assert.equal(values.todayLong, "08 de setembro de 2026");
  assert.equal(values.locationDate, "08 de setembro de 2026.");

  const filled = substituteReportVariables(
    CRIMINAL_BACKGROUND_REPORT_HTML,
    values,
  );
  assert.match(filled, /<strong><u>DECLARAÇÃO<\/u><\/strong>/);
  assert.match(filled, /<strong>ORAN ALDER MC GEE<\/strong>/);
  assert.match(filled, /nacional da Estados Unidos/);
  assert.match(filled, /<strong>DECLARO<\/strong>/);
  assert.match(
    filled,
    /com base no Resolução Normativa 30\/2018 \(RN 02\/2017\)\./,
  );
  assert.equal(extractReportVariableKeys(filled).length, 0);

  const missing = missingUsedReportVariables(
    CRIMINAL_BACKGROUND_REPORT_HTML,
    values,
  );
  assert.equal(missing.includes("visaReceiptPlace"), false);
  assert.equal(missing.includes("personNameUpper"), false);

  assert.equal(
    suggestedReportFilename({
      templateName: CRIMINAL_BACKGROUND_REPORT_NAME,
      personName: values.personName,
      todayIso: "2026-09-08",
    }),
    "ORAN_ALDER_MC_GEE - aus ant crim - 08_set_2026",
  );
});

test("flags empty declaration chips as missing fields", () => {
  const values = buildReportVariableValues({
    process: {
      person: {
        givenNames: "Maria",
        surname: "Silva",
        sex: "Female",
      },
    },
    statuses: [],
    passportFileUploaded: false,
    i18n,
    extras: { todayIso: "2026-09-08" },
  });

  assert.equal(values.bornWord, "nascida");
  assert.equal(values.childWord, "filha");
  assert.equal(values.holderWord, "portadora");
  assert.equal(values.passportNumber, "______");
  assert.equal(values.issuingCountryOfficial, "______");
  const missing = missingUsedReportVariables(
    CRIMINAL_BACKGROUND_REPORT_HTML,
    values,
  );
  assert.ok(missing.includes("nationalityShort"));
  assert.ok(missing.includes("maritalStatusText"));
  assert.ok(missing.includes("passportNumber"));
  assert.ok(missing.includes("issuingCountryOfficial"));
});

test("builds a DOCX from filled report HTML with bold title and DECLARO", async () => {
  const values = buildReportVariableValues({
    process: {
      legalFramework: { name: "Resolução Normativa 30/2018 (RN 02/2017)" },
      person: {
        givenNames: "Oran",
        middleName: "Alder",
        surname: "Mc Gee",
        sex: "Male",
        maritalStatus: "Married",
        birthDate: "1979-08-18",
        fatherName: "Gary W Mc Gee",
        motherName: "Sara Lee",
        nationality: { name: "United States", code: "US" },
      },
      passport: {
        passportNumber: "A54269887",
        issuingCountry: { name: "United States", code: "US" },
        issueDate: "2024-11-21",
        expiryDate: "2034-11-20",
      },
    },
    statuses: [],
    passportFileUploaded: false,
    i18n,
    extras: {
      todayIso: "2026-09-08",
      nationalityCode: "US",
      nationalityName: "United States",
      issuingCountryCode: "US",
      issuingCountryName: "United States",
      issuingCountryFullName: "Estados Unidos da América",
    },
  });
  const filled = substituteReportVariables(
    CRIMINAL_BACKGROUND_REPORT_HTML,
    values,
  );
  const blob = await htmlToDocxBlob(filled);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);

  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml);
  assert.match(xml, /DECLARAÇÃO/);
  assert.match(xml, /ORAN ALDER MC GEE/);
  assert.match(xml, /DECLARO/);
  assert.match(xml, /A54269887/);
  assert.match(xml, /w:b\b/);
  assert.match(xml, /w:u\b/);
});

test("unbolded variable chip stays plain after substitution", () => {
  const html =
    '<p><span data-type="report-variable" data-key="personName">Nome do indivíduo</span></p>';
  const result = substituteReportVariables(html, {
    personName: "Oran Alder Mc Gee",
  });
  assert.equal(result, "<p>Oran Alder Mc Gee</p>");
});

test("fills the professional experience declaration from process CBO activities", () => {
  const values = buildReportVariableValues({
    process: {
      professionalExperienceSince: "2020-08-01",
      cboActivities:
        "i) Selecionar, preparar e aplicar materiais.\nii) Avaliar peças com precisão técnica.",
      person: {
        givenNames: "Can",
        middleName: "Aslan",
        surname: "Durkaya",
        sex: "Male",
      },
      userApplicant: {
        givenNames: "Firat",
        surname: "Galipogullari",
      },
      cbo: {
        code: "3121-05",
        title: "Técnico de matéria-prima e material",
      },
      companyApplicant: {
        name: "CADDELL CONSTRUCTION CO. (DE) LLC",
        companyGroup: { name: "CADDELL" },
        city: { name: "Montgomery" },
        state: { code: "AL" },
      },
    },
    statuses: [],
    passportFileUploaded: false,
    i18n,
    extras: {
      todayIso: "2026-09-02",
      visaReceiptCityName: "Rio de Janeiro",
      visaReceiptStateCode: "RJ",
    },
  });

  assert.equal(values.srPhrase, "o Sr.");
  assert.equal(values.employeeWord, "funcionário");
  assert.equal(values.personNameUpper, "CAN ASLAN DURKAYA");
  assert.equal(values.cboTitleUpper, "TÉCNICO DE MATÉRIA-PRIMA E MATERIAL");
  assert.equal(values.professionalExperienceSinceLong, "01 de agosto de 2020");
  assert.equal(values.companyCity, "Montgomery/AL");
  assert.equal(
    values.companyGroupClause,
    " que pertence ao grupo de empresas CADDELL",
  );
  assert.equal(
    values.companyEmploymentPlace,
    "CADDELL CONSTRUCTION CO. (DE) LLC, Montgomery/AL que pertence ao grupo de empresas CADDELL",
  );
  assert.match(values.atividadeCBO, /Selecionar, preparar/);
  assert.equal(values.userApplicantName, "Firat Galipogullari");
  assert.equal(values.locationDate, "Rio de Janeiro/RJ, 02 de setembro de 2026.");

  const filled = substituteReportVariables(
    PROFESSIONAL_EXPERIENCE_REPORT_HTML,
    values,
  );
  assert.match(filled, /DECLARAÇÃO DE EXPERIÊNCIA PROFISSIONAL/);
  assert.match(filled, /o Sr\./);
  assert.match(filled, /CAN ASLAN DURKAYA/);
  assert.match(filled, /CADDELL CONSTRUCTION CO/);
  assert.match(filled, /grupo de empresas CADDELL/);
  assert.match(filled, /01 de agosto de 2020/);
  assert.match(filled, /TÉCNICO DE MATÉRIA-PRIMA E MATERIAL/);
  assert.match(filled, /Selecionar, preparar/);
  assert.match(filled, /Firat Galipogullari/);
  assert.match(filled, /Representante legal/);
  assert.equal(extractReportVariableKeys(filled).length, 0);

  const withoutGroup = buildReportVariableValues({
    process: {
      companyApplicant: {
        name: "Empresa Sem Grupo Ltda",
        city: { name: "São Paulo" },
        state: { code: "SP" },
      },
      person: { givenNames: "Maria", surname: "Silva", sex: "Female" },
    },
    statuses: [],
    passportFileUploaded: false,
    i18n,
  });
  assert.equal(withoutGroup.srPhrase, "a Sra.");
  assert.equal(withoutGroup.employeeWord, "funcionária");
  assert.equal(withoutGroup.companyGroupClause, "");
  assert.equal(
    withoutGroup.companyEmploymentPlace,
    "Empresa Sem Grupo Ltda, São Paulo/SP",
  );

  const fromLegacyGroupName = buildReportVariableValues({
    process: {
      companyApplicant: {
        name: "CADDELL CONSTRUCTION CO. (DE) LLC",
        groupName: "CADDELL",
        city: { name: "Montgomery" },
        state: { code: "AL" },
      },
    },
    statuses: [],
    passportFileUploaded: false,
    i18n,
  });
  assert.equal(
    fromLegacyGroupName.companyGroupClause,
    " que pertence ao grupo de empresas CADDELL",
  );

  const prefersRelatedGroup = buildReportVariableValues({
    process: {
      companyApplicant: {
        name: "ACME Ltda",
        groupName: "OLD",
        companyGroup: { name: "NEW" },
      },
    },
    statuses: [],
    passportFileUploaded: false,
    i18n,
  });
  assert.equal(prefersRelatedGroup.companyGroup, "NEW");
  assert.equal(
    prefersRelatedGroup.companyGroupClause,
    " que pertence ao grupo de empresas NEW",
  );
  const missing = missingUsedReportVariables(
    PROFESSIONAL_EXPERIENCE_REPORT_HTML,
    withoutGroup,
  );
  assert.equal(missing.includes("companyGroupClause"), false);
  assert.ok(missing.includes("atividadeCBO"));

  assert.equal(
    suggestedReportFilename({
      templateName: PROFESSIONAL_EXPERIENCE_REPORT_NAME,
      personName: values.personName,
      todayIso: "2026-09-02",
    }),
    "CAN_ASLAN_DURKAYA - exp prof - 02_set_2026",
  );
});
