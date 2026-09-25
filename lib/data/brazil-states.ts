/**
 * Brazilian state codes (UF) mapped to official names.
 * Used when filling address fields from the national CEP API.
 */
export const BRAZIL_STATE_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export const BRAZIL_COUNTRY_CODE = "BR";

function foldStateLabel(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getBrazilStateName(uf: string): string {
  const code = uf.trim().toUpperCase();
  return BRAZIL_STATE_NAMES[code] ?? uf;
}

/**
 * Accepts a 2-letter UF ("RJ"), a lowercase cmdk value ("rj"), or a
 * state name ("Rio de Janeiro") and returns the official UF code.
 */
export function normalizeBrazilStateCode(
  code?: string | null,
  name?: string | null,
): string | undefined {
  const fromCode = matchBrazilStateToken(code);
  if (fromCode) return fromCode;
  return matchBrazilStateToken(name);
}

function matchBrazilStateToken(
  value?: string | null,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  if (upper in BRAZIL_STATE_NAMES) return upper;

  const folded = foldStateLabel(trimmed);
  for (const [uf, label] of Object.entries(BRAZIL_STATE_NAMES)) {
    if (foldStateLabel(label) === folded) return uf;
  }
  return undefined;
}
