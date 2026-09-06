/**
 * Official Portuguese country names for legal documents (passports, declarations).
 * Keys are ISO 3166-1 alpha-2 codes.
 *
 * Short display names stay in `countries.name` / i18n `Countries.names`.
 * These official names fill `countries.fullName` and the passport-issuing clause.
 */
import { countries } from "./countries-phone"
import { translateCountryName } from "../utils/country-translations"

export const COUNTRY_OFFICIAL_NAMES_PT: Record<string, string> = {
  AD: "Principado de Andorra",
  AE: "Emirados Árabes Unidos",
  AF: "República Islâmica do Afeganistão",
  AL: "República da Albânia",
  AM: "República da Armênia",
  AO: "República de Angola",
  AR: "República Argentina",
  AT: "República da Áustria",
  AU: "Comunidade da Austrália",
  AZ: "República do Azerbaijão",
  BA: "Bósnia e Herzegovina",
  BD: "República Popular de Bangladesh",
  BE: "Reino da Bélgica",
  BF: "Burkina Faso",
  BG: "República da Bulgária",
  BH: "Reino do Bahrein",
  BI: "República do Burundi",
  BJ: "República do Benin",
  BN: "Negara Brunei Darussalam",
  BO: "Estado Plurinacional da Bolívia",
  BR: "República Federativa do Brasil",
  BT: "Reino do Butão",
  BW: "República de Botsuana",
  BY: "República da Bielorrússia",
  BZ: "Belize",
  CA: "Canadá",
  CD: "República Democrática do Congo",
  CF: "República Centro-Africana",
  CG: "República do Congo",
  CH: "Confederação Suíça",
  CL: "República do Chile",
  CM: "República de Camarões",
  CN: "República Popular da China",
  CO: "República da Colômbia",
  CR: "República da Costa Rica",
  CU: "República de Cuba",
  CV: "República de Cabo Verde",
  CY: "República de Chipre",
  CZ: "República Tcheca",
  DE: "República Federal da Alemanha",
  DJ: "República do Djibuti",
  DK: "Reino da Dinamarca",
  DO: "República Dominicana",
  DZ: "República Argelina Democrática e Popular",
  EC: "República do Equador",
  EE: "República da Estônia",
  EG: "República Árabe do Egito",
  ER: "Estado da Eritreia",
  ES: "Reino da Espanha",
  ET: "República Democrática Federal da Etiópia",
  FI: "República da Finlândia",
  FJ: "República das Fiji",
  FM: "Estados Federados da Micronésia",
  FR: "República Francesa",
  GA: "República Gabonesa",
  GB: "Reino Unido da Grã-Bretanha e Irlanda do Norte",
  GE: "Geórgia",
  GH: "República de Gana",
  GM: "República da Gâmbia",
  GN: "República da Guiné",
  GQ: "República da Guiné Equatorial",
  GR: "República Helênica",
  GT: "República da Guatemala",
  GW: "República da Guiné-Bissau",
  GY: "República Cooperativa da Guiana",
  HK: "Região Administrativa Especial de Hong Kong da República Popular da China",
  HN: "República de Honduras",
  HR: "República da Croácia",
  HT: "República do Haiti",
  HU: "Hungria",
  ID: "República da Indonésia",
  IE: "Irlanda",
  IL: "Estado de Israel",
  IN: "República da Índia",
  IQ: "República do Iraque",
  IR: "República Islâmica do Irã",
  IS: "Islândia",
  IT: "República Italiana",
  JM: "Jamaica",
  JO: "Reino Hachemita da Jordânia",
  JP: "Japão",
  KE: "República do Quênia",
  KG: "República do Quirguistão",
  KH: "Reino do Camboja",
  KI: "República de Kiribati",
  KM: "União das Comores",
  KP: "República Popular Democrática da Coreia",
  KR: "República da Coreia",
  KW: "Estado do Kuwait",
  KZ: "República do Cazaquistão",
  LA: "República Democrática Popular do Laos",
  LB: "República Libanesa",
  LI: "Principado de Liechtenstein",
  LK: "República Democrática Socialista do Sri Lanka",
  LR: "República da Libéria",
  LS: "Reino do Lesoto",
  LT: "República da Lituânia",
  LU: "Grão-Ducado de Luxemburgo",
  LV: "República da Letônia",
  LY: "Estado da Líbia",
  MA: "Reino de Marrocos",
  MC: "Principado de Mônaco",
  MD: "República da Moldávia",
  ME: "Montenegro",
  MG: "República de Madagascar",
  MH: "República das Ilhas Marshall",
  MK: "República da Macedônia do Norte",
  ML: "República do Mali",
  MM: "República da União de Mianmar",
  MN: "Mongólia",
  MO: "Região Administrativa Especial de Macau da República Popular da China",
  MR: "República Islâmica da Mauritânia",
  MT: "República de Malta",
  MU: "República de Maurício",
  MV: "República das Maldivas",
  MW: "República do Malauí",
  MX: "Estados Unidos Mexicanos",
  MY: "Malásia",
  MZ: "República de Moçambique",
  NA: "República da Namíbia",
  NE: "República do Níger",
  NG: "República Federal da Nigéria",
  NI: "República da Nicarágua",
  NL: "Reino dos Países Baixos",
  NO: "Reino da Noruega",
  NP: "República Democrática Federal do Nepal",
  NR: "República de Nauru",
  NZ: "Nova Zelândia",
  OM: "Sultanato de Omã",
  PA: "República do Panamá",
  PE: "República do Peru",
  PG: "Estado Independente da Papua-Nova Guiné",
  PH: "República das Filipinas",
  PK: "República Islâmica do Paquistão",
  PL: "República da Polônia",
  PS: "Estado da Palestina",
  PT: "República Portuguesa",
  PW: "República de Palau",
  PY: "República do Paraguai",
  QA: "Estado do Catar",
  RO: "Romênia",
  RS: "República da Sérvia",
  RU: "Federação da Rússia",
  RW: "República de Ruanda",
  SA: "Reino da Arábia Saudita",
  SB: "Ilhas Salomão",
  SC: "República das Seicheles",
  SD: "República do Sudão",
  SE: "Reino da Suécia",
  SG: "República de Singapura",
  SI: "República da Eslovênia",
  SK: "República Eslovaca",
  SL: "República de Serra Leoa",
  SM: "República de San Marino",
  SN: "República do Senegal",
  SO: "República Federal da Somália",
  SR: "República do Suriname",
  SS: "República do Sudão do Sul",
  ST: "República Democrática de São Tomé e Príncipe",
  SV: "República de El Salvador",
  SY: "República Árabe Síria",
  SZ: "Reino de Essuatíni",
  TD: "República do Chade",
  TG: "República Togolesa",
  TH: "Reino da Tailândia",
  TJ: "República do Tajiquistão",
  TL: "República Democrática de Timor-Leste",
  TM: "Turcomenistão",
  TN: "República da Tunísia",
  TO: "Reino de Tonga",
  TR: "República da Turquia",
  TT: "República de Trinidad e Tobago",
  TV: "Tuvalu",
  TW: "Taiwan",
  TZ: "República Unida da Tanzânia",
  UA: "Ucrânia",
  UG: "República de Uganda",
  US: "Estados Unidos da América",
  UY: "República Oriental do Uruguai",
  UZ: "República do Uzbequistão",
  VA: "Estado da Cidade do Vaticano",
  VE: "República Bolivariana da Venezuela",
  VN: "República Socialista do Vietnã",
  VU: "República de Vanuatu",
  WS: "Estado Independente de Samoa",
  YE: "República do Iêmen",
  ZA: "República da África do Sul",
  ZM: "República de Zâmbia",
  ZW: "República do Zimbábue",
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

/**
 * Resolve the official Portuguese name from an ISO code and/or a stored country name.
 */
export function resolveOfficialCountryName(
  code?: string | null,
  name?: string | null,
): string | undefined {
  const normalizedCode = code?.trim().toUpperCase() ?? ""
  if (normalizedCode.length >= 2 && COUNTRY_OFFICIAL_NAMES_PT[normalizedCode]) {
    return COUNTRY_OFFICIAL_NAMES_PT[normalizedCode]
  }

  const codeFromName = findCountryCodeByName(name)
  if (codeFromName && COUNTRY_OFFICIAL_NAMES_PT[codeFromName]) {
    return COUNTRY_OFFICIAL_NAMES_PT[codeFromName]
  }

  return undefined
}

export function findCountryCodeByName(name?: string | null): string | undefined {
  if (!name?.trim()) return undefined
  const target = normalizeName(name)

  for (const country of countries) {
    if (normalizeName(country.name) === target) return country.code
    const translated = translateCountryName(country.name, "pt")
    if (translated && normalizeName(translated) === target) return country.code
  }

  for (const [iso, official] of Object.entries(COUNTRY_OFFICIAL_NAMES_PT)) {
    if (normalizeName(official) === target) return iso
  }

  return undefined
}

export function getOfficialCountryNameOrFallback(
  code?: string | null,
  name?: string | null,
  storedFullName?: string | null,
): string {
  const stored = storedFullName?.trim()
  if (stored) return stored
  return resolveOfficialCountryName(code, name) ?? name?.trim() ?? ""
}
