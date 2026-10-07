import assert from "node:assert/strict";
import test from "node:test";

import { filterComboboxOptionByLabel } from "../lib/combobox-filter";
import { buildReportVariableValues } from "../lib/report-templates/format-values";
import {
  REPORT_VARIABLES,
  resolveReportVariableKey,
} from "../lib/report-templates/variables";
import en from "../messages/en.json";
import pt from "../messages/pt.json";

const i18n = {
  locale: "pt",
  tProcess: (key: string) => key,
  tPeople: (key: string) => key,
  tPassports: (key: string) => key,
  tCommon: (key: string) => key,
  translateCountry: (name: string) => name,
};

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item));
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => collectStrings(item));
  }
  return [];
}

test("renames Pessoa de Contato to Representante Legal in pt and en UI copy", () => {
  assert.equal(pt.Companies.contactPerson, "Representante Legal");
  assert.equal(pt.Companies.contactPersonName, "Representante Legal");
  assert.equal(pt.CollectiveProcesses.contactPerson, "Representante Legal");
  assert.equal(pt.ProcessRequests.contactPerson, "Representante Legal");
  assert.equal(en.Companies.contactPerson, "Legal Representative");
  assert.equal(en.Companies.contactPersonName, "Legal Representative");
  assert.equal(en.CollectiveProcesses.contactPerson, "Legal Representative");
  assert.equal(en.ProcessRequests.contactPerson, "Legal Representative");

  const uiCopy = [...collectStrings(pt), ...collectStrings(en)];
  for (const text of uiCopy) {
    assert.equal(
      /pessoa de contato/i.test(text),
      false,
      `UI copy still mentions Pessoa de Contato: ${text}`,
    );
    assert.equal(
      /contact person/i.test(text),
      false,
      `UI copy still mentions Contact Person: ${text}`,
    );
  }
});

test("legal representative variables resolve from the linked company person", () => {
  const keys = [
    "legalRepresentativeName",
    "legalRepresentativeCpf",
    "legalRepresentativeEmail",
    "legalRepresentativePhone",
    "legalRepresentativeCargo",
  ] as const;

  for (const key of keys) {
    assert.ok(
      REPORT_VARIABLES.some((item) => item.key === key),
      `missing catalog key ${key}`,
    );
  }

  assert.equal(
    resolveReportVariableKey("representante legal"),
    "legalRepresentativeName",
  );
  assert.equal(
    resolveReportVariableKey("cpf do representante legal"),
    "legalRepresentativeCpf",
  );

  const values = buildReportVariableValues({
    process: {
      companyApplicant: {
        name: "ACME Ltda",
        contactPerson: {
          givenNames: "Ana",
          middleName: "Lima",
          surname: "Souza",
          cpf: "03986763724",
          email: "ana@acme.com",
          phoneNumber: "+55 11 99999-0000",
          cargo: "Diretora",
        },
      },
    },
    statuses: [],
    passportFileUploaded: false,
    i18n,
  });

  assert.equal(values.legalRepresentativeName, "Ana Lima Souza");
  assert.equal(values.legalRepresentativeCpf, "039.867.637-24");
  assert.equal(values.legalRepresentativeEmail, "ana@acme.com");
  assert.equal(values.legalRepresentativePhone, "+55 11 99999-0000");
  assert.equal(values.legalRepresentativeCargo, "Diretora");

  const empty = buildReportVariableValues({
    process: { companyApplicant: { name: "ACME Ltda" } },
    statuses: [],
    passportFileUploaded: false,
    i18n,
  });
  assert.equal(empty.legalRepresentativeName, "");
  assert.equal(empty.legalRepresentativeCpf, "");
  assert.equal(empty.legalRepresentativeEmail, "");
  assert.equal(empty.legalRepresentativePhone, "");
  assert.equal(empty.legalRepresentativeCargo, "");
});

test("combobox filter matches option labels, not value ids", () => {
  const options = [
    { value: "jd7abc123maria", label: "João Pereira" },
    { value: "jd7def456joao", label: "Maria Santos" },
  ];

  assert.equal(filterComboboxOptionByLabel("jd7abc123maria", "joao", options), 1);
  assert.equal(filterComboboxOptionByLabel("jd7abc123maria", "JOÃO", options), 1);
  assert.equal(
    filterComboboxOptionByLabel("jd7abc123maria", "pereira", options),
    1,
  );
  assert.equal(
    filterComboboxOptionByLabel("jd7abc123maria", "maria", options),
    0,
  );
  assert.equal(
    filterComboboxOptionByLabel("jd7def456joao", "maria", options),
    1,
  );
  assert.equal(filterComboboxOptionByLabel("jd7def456joao", "joao", options), 0);
  assert.equal(filterComboboxOptionByLabel("missing", "maria", options), 0);
  assert.equal(filterComboboxOptionByLabel("jd7abc123maria", "", options), 1);
});
