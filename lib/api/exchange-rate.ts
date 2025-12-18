/**
 * BrasilAPI - Exchange Rate Utilities
 * Fetches current exchange rates for supported currencies
 */

// Moedas suportadas pela BrasilAPI
const BRASILAPI_SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "DKK", "SEK"
] as const;

type BrasilAPICurrency = typeof BRASILAPI_SUPPORTED_CURRENCIES[number];

interface ExchangeRateResponse {
  moeda: string;
  data: string;
  cotacoes: Array<{
    cotacao_compra: number;
    cotacao_venda: number;
    paridade_compra: number;
    paridade_venda: number;
    data_hora_cotacao: string;
    tipo_boletim: string;
  }>;
}

/**
 * Verifica se a moeda é suportada pela BrasilAPI
 */
export function isSupportedCurrency(currencyCode: string): currencyCode is BrasilAPICurrency {
  return BRASILAPI_SUPPORTED_CURRENCIES.includes(currencyCode as BrasilAPICurrency);
}

/**
 * Busca a taxa de câmbio de uma moeda para uma data específica
 *
 * @param currencyCode - Código ISO da moeda
 * @param dateStr - Data no formato YYYY-MM-DD
 * @returns Taxa de câmbio ou null se não encontrado
 */
async function fetchExchangeRateForDate(
  currencyCode: string,
  dateStr: string
): Promise<number | null> {
  const url = `https://brasilapi.com.br/api/cambio/v1/cotacao/${currencyCode}/${dateStr}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // 404 significa que não há dados para essa data (silenciosamente retorna null)
      if (response.status === 404) {
        return null;
      }
      // Outros erros também retornam null silenciosamente
      // O tratamento de erro já é feito no formulário com toast
      return null;
    }

    const data: ExchangeRateResponse = await response.json();

    // Pegar a última cotação disponível (geralmente FECHAMENTO PTAX)
    // Usar cotação de venda como padrão
    const latestQuote = data.cotacoes[data.cotacoes.length - 1];

    if (!latestQuote || !latestQuote.cotacao_venda) {
      return null;
    }

    // Retornar cotação de venda arredondada para 4 casas decimais
    return Math.round(latestQuote.cotacao_venda * 10000) / 10000;
  } catch (error) {
    // Erro silencioso - o tratamento é feito no formulário
    return null;
  }
}

/**
 * Busca a taxa de câmbio atual de uma moeda em relação ao Real (BRL)
 * Com fallback para os últimos 30 dias úteis caso a data atual não tenha dados
 *
 * @param currencyCode - Código ISO da moeda (USD, EUR, GBP, etc.)
 * @returns Taxa de câmbio (1 moeda estrangeira = X reais) ou null em caso de erro
 *
 * @example
 * const rate = await fetchExchangeRate("USD");
 * // Retorna: 5.75 (1 USD = 5.75 BRL)
 */
export async function fetchExchangeRate(currencyCode: string): Promise<number | null> {
  try {
    // Verifica se a moeda é suportada
    if (!isSupportedCurrency(currencyCode)) {
      console.warn(`Currency ${currencyCode} is not supported by BrasilAPI`);
      return null;
    }

    // Tenta buscar a taxa começando pela data atual e retrocedendo até 30 dias
    // Isso é necessário porque a BrasilAPI não tem dados para fins de semana e feriados
    const today = new Date();

    for (let daysAgo = 0; daysAgo <= 30; daysAgo++) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split('T')[0];

      const rate = await fetchExchangeRateForDate(currencyCode, dateStr);

      if (rate !== null) {
        // Encontrou uma taxa válida
        if (daysAgo > 0) {
          console.log(`Exchange rate found for ${dateStr} (${daysAgo} days ago)`);
        }
        return rate;
      }
    }

    // Se chegou aqui, não encontrou dados nos últimos 30 dias
    // Não loga erro porque já será tratado no formulário com toast
    console.warn(`No exchange rate data available for ${currencyCode} in the last 30 days`);
    return null;

  } catch (error) {
    // Não loga erro porque já será tratado no formulário com toast
    console.warn('Error fetching exchange rate:', error);
    return null;
  }
}

/**
 * Formata a taxa de câmbio para exibição
 */
export function formatExchangeRate(rate: number | null): string {
  if (rate === null) return '-';
  return rate.toFixed(4);
}
