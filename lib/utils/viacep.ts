import { cleanDocumentNumber } from "@/lib/utils/document-masks";
import { getBrazilStateName } from "@/lib/data/brazil-states";

export const CEP_DIGIT_COUNT = 8;

export type BrazilianCepAddress = {
  street: string;
  complement: string;
  city: string;
  stateCode: string;
  stateName: string;
  postalCode: string;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
};

type BrasilApiCepResponse = {
  cep?: string;
  street?: string;
  complement?: string;
  city?: string;
  state?: string;
};

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isCompleteCep(cep: string): boolean {
  return cleanDocumentNumber(cep).length === CEP_DIGIT_COUNT;
}

export function parseViaCepResponse(
  data: ViaCepResponse,
): BrazilianCepAddress | null {
  if (data.erro === true || data.erro === "true") {
    return null;
  }

  const stateCode = asTrimmedString(data.uf).toUpperCase();
  const city = asTrimmedString(data.localidade);
  if (!stateCode || !city) {
    return null;
  }

  return {
    street: asTrimmedString(data.logradouro),
    complement: asTrimmedString(data.complemento),
    city,
    stateCode,
    stateName: getBrazilStateName(stateCode),
    postalCode: cleanDocumentNumber(data.cep ?? ""),
  };
}

export function parseBrasilApiCepResponse(
  data: BrasilApiCepResponse,
): BrazilianCepAddress | null {
  const stateCode = asTrimmedString(data.state).toUpperCase();
  const city = asTrimmedString(data.city);
  if (!stateCode || !city) {
    return null;
  }

  return {
    street: asTrimmedString(data.street),
    complement: asTrimmedString(data.complement),
    city,
    stateCode,
    stateName: getBrazilStateName(stateCode),
    postalCode: cleanDocumentNumber(data.cep ?? ""),
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CEP lookup failed with status ${response.status}`);
  }
  return (await response.json()) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Looks up a Brazilian CEP using ViaCEP, falling back to BrasilAPI.
 * Returns null when the CEP is unknown. Throws on network/transport errors.
 */
export async function lookupBrazilianCep(
  cep: string,
): Promise<BrazilianCepAddress | null> {
  const digits = cleanDocumentNumber(cep);
  if (digits.length !== CEP_DIGIT_COUNT) {
    return null;
  }

  try {
    const viaCep = await fetchJson(
      `https://viacep.com.br/ws/${digits}/json/`,
    );
    if (isRecord(viaCep)) {
      const parsed = parseViaCepResponse(viaCep as ViaCepResponse);
      if (parsed) return parsed;
    }
  } catch {
    // Fall through to BrasilAPI.
  }

  const brasilApi = await fetchJson(
    `https://brasilapi.com.br/api/cep/v2/${digits}`,
  );
  if (!isRecord(brasilApi)) {
    return null;
  }
  return parseBrasilApiCepResponse(brasilApi as BrasilApiCepResponse);
}
