import assert from "node:assert/strict"
import test from "node:test"

import {
  COUNTRY_OFFICIAL_NAMES_PT,
  getOfficialCountryNameOrFallback,
  resolveOfficialCountryName,
} from "../lib/data/country-official-names-pt"
import { buildCriminalBackgroundDeclaration } from "../lib/process-reports/criminal-background-declaration"
import { formatLongDatePt, todayIsoInSaoPaulo } from "../lib/process-reports/pt-dates"
import { REPORT_PLACEHOLDER } from "../lib/process-reports/types"

test("formats Portuguese long dates with zero-padded day", () => {
  assert.equal(formatLongDatePt("2001-04-04"), "04 de abril de 2001")
  assert.equal(formatLongDatePt("2023-05-07"), "07 de maio de 2023")
  assert.equal(formatLongDatePt("2028-05-07"), "07 de maio de 2028")
})

test("resolves Turkey official name from code or short names", () => {
  assert.equal(resolveOfficialCountryName("TR"), "República da Turquia")
  assert.equal(resolveOfficialCountryName("", "Turkey"), "República da Turquia")
  assert.equal(resolveOfficialCountryName("", "Turquia"), "República da Turquia")
  assert.equal(COUNTRY_OFFICIAL_NAMES_PT.BR, "República Federativa do Brasil")
})

test("stored full name wins over the canonical mapping", () => {
  assert.equal(
    getOfficialCountryNameOrFallback("TR", "Turquia", "República da Turquia (custom)"),
    "República da Turquia (custom)",
  )
})

test("builds the criminal background declaration from process fields", () => {
  const report = buildCriminalBackgroundDeclaration({
    candidateName: "Can Aslan Durkaya",
    sex: "Male",
    maritalStatus: "Single",
    birthDate: "2001-04-04",
    fatherName: "Idris Durkaya",
    motherName: "Sevgi Ozkapu",
    nationalityName: "Turkey",
    nationalityCode: "TR",
    nationalityFullName: "República da Turquia",
    passportNumber: "U40041601",
    passportIssueDate: "2023-05-07",
    passportExpiryDate: "2028-05-07",
    issuingCountryName: "Turkey",
    issuingCountryCode: "TR",
    issuingCountryFullName: "República da Turquia",
    legalFrameworkName: "Art. 4º da RN 02/2017 CNIg",
    cityName: "Rio de Janeiro",
    stateCode: "RJ",
    todayIso: "2026-09-02",
  })

  const body = report.body.map((run) => run.text).join("")

  assert.equal(report.title, "DECLARAÇÃO")
  assert.match(body, /CAN ASLAN DURKAYA/)
  assert.match(body, /nacional da Turquia/)
  assert.match(body, /solteiro/)
  assert.match(body, /nascido em 04 de abril de 2001/)
  assert.match(body, /IDRIS DURKAYA \(pai\)/)
  assert.match(body, /SEVGI OZKAPU \(mãe\)/)
  assert.match(body, /passaporte de nº U40041601/)
  assert.match(body, /emitido em 07 de maio de 2023 pela República da Turquia/)
  assert.match(body, /válido até 07 de maio de 2028/)
  assert.match(body, /Art\. 4º da RN 02\/2017 CNIg/)
  assert.equal(report.missingFields.length, 0)
  assert.equal(
    report.locationDate.map((run) => run.text).join(""),
    "Rio de Janeiro/RJ, 02 de setembro de 2026.",
  )
  assert.equal(report.signatureName, "CAN ASLAN DURKAYA")
  assert.match(report.filenameBase, /aus ant crim/)
  assert.match(report.filenameBase, /02_set_2026/)
})

test("uses the legal framework name and gendered language", () => {
  const report = buildCriminalBackgroundDeclaration({
    candidateName: "Maria Silva",
    sex: "Female",
    maritalStatus: "Married",
    birthDate: "1990-01-15",
    fatherName: "Joao",
    motherName: "Ana",
    nationalityName: "Brazil",
    nationalityCode: "BR",
    nationalityFullName: null,
    passportNumber: "AB123",
    passportIssueDate: "2020-02-01",
    passportExpiryDate: "2030-02-01",
    issuingCountryName: "Brazil",
    issuingCountryCode: "BR",
    issuingCountryFullName: null,
    legalFrameworkName: "Art. 4º da RN 08/2017 CNIg — Residência",
    cityName: null,
    stateCode: null,
    todayIso: "2026-09-06",
  })

  const body = report.body.map((run) => run.text).join("")
  assert.match(body, /casada/)
  assert.match(body, /nascida em/)
  assert.match(body, /filha de/)
  assert.match(body, /portadora do passaporte/)
  assert.match(body, /República Federativa do Brasil/)
  assert.match(body, /Art\. 4º da RN 08\/2017 CNIg — Residência/)
})

test("marks missing fields and inserts placeholders", () => {
  const report = buildCriminalBackgroundDeclaration({
    candidateName: "",
    sex: null,
    maritalStatus: null,
    birthDate: null,
    fatherName: null,
    motherName: null,
    nationalityName: null,
    nationalityCode: null,
    nationalityFullName: null,
    passportNumber: null,
    passportIssueDate: null,
    passportExpiryDate: null,
    issuingCountryName: null,
    issuingCountryCode: null,
    issuingCountryFullName: null,
    legalFrameworkName: null,
    cityName: null,
    stateCode: null,
    todayIso: "2026-09-06",
  })

  const body = report.body.map((run) => run.text).join("")
  assert.ok(body.includes(REPORT_PLACEHOLDER))
  assert.ok(report.missingFields.includes("candidateName"))
  assert.ok(report.missingFields.includes("legalFramework"))
  assert.ok(report.missingFields.includes("passportNumber"))
})

test("today in Sao Paulo is an ISO date", () => {
  assert.match(todayIsoInSaoPaulo(new Date("2026-09-06T15:00:00Z")), /^\d{4}-\d{2}-\d{2}$/)
})
