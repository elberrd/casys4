/**
 * Character limit for the document field labeled "Observações (opcional)"
 * (`versionNotes` on process documents and standalone document versions).
 *
 * Standardized to (largest previous application limit) × 10.
 * Previous frontend/Zod cap was 500 everywhere this field was limited.
 */
export const OBSERVACOES_MAX_LENGTH = 5000;

export function assertObservacoesMaxLength(
  value: string | undefined,
): void {
  if (value !== undefined && value.length > OBSERVACOES_MAX_LENGTH) {
    throw new Error(
      `Observations must be at most ${OBSERVACOES_MAX_LENGTH} characters`,
    );
  }
}
