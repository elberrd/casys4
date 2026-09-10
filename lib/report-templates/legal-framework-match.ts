/**
 * A report template is available on an individual process when:
 * - it has no legal framework, or
 * - its legal framework is exactly the same as the process.
 */
export function reportTemplateMatchesProcessLegalFramework(
  templateLegalFrameworkId: string | undefined,
  processLegalFrameworkId: string | undefined,
): boolean {
  if (templateLegalFrameworkId === undefined) {
    return true;
  }
  return templateLegalFrameworkId === processLegalFrameworkId;
}
