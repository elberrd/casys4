/**
 * System case status codes that are referenced in backend logic.
 * These statuses cannot be deleted, deactivated, or have their codes changed.
 */
export const SYSTEM_CASE_STATUS_CODES = [
  "em_preparacao",
  "em_tramite",
  "encaminhado_analise",
  "exigencia",
  "juntada_documento",
  "proposta_deferimento",
  "deferido",
  "publicado_dou",
  "emissao_vitem",
  "entrada_brasil",
  "rnm",
  "em_renovacao",
  "pedido_cancelamento",
  "pedido_arquivamento",
  "pedido_cancelado",
  "nova_solicitacao_visto",
  "diario_oficial",
] as const;

export type SystemCaseStatusCode = (typeof SYSTEM_CASE_STATUS_CODES)[number];

export function isSystemCaseStatus(code: string): boolean {
  return (SYSTEM_CASE_STATUS_CODES as readonly string[]).includes(code);
}
