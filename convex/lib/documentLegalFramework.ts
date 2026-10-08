import { Doc, Id, TableNames } from "../_generated/dataModel";
import { resolveLegalFrameworkRef } from "../../lib/legal-framework-display";

type DbGet = <T extends TableNames>(id: Id<T>) => Promise<Doc<T> | null>;

export async function resolveDocumentTypeLegalFramework(
  get: DbGet,
  documentTypeLegalFrameworkId:
    | Id<"documentTypesLegalFrameworks">
    | undefined,
): Promise<{
  legalFrameworkName: string | null;
  legalFrameworkRemoved: boolean;
}> {
  if (!documentTypeLegalFrameworkId) {
    return { legalFrameworkName: null, legalFrameworkRemoved: false };
  }

  const association = await get(documentTypeLegalFrameworkId);
  const legalFramework = association
    ? await get(association.legalFrameworkId)
    : null;
  const resolved = resolveLegalFrameworkRef({
    associationId: documentTypeLegalFrameworkId,
    association,
    legalFramework,
  });

  return {
    legalFrameworkName: resolved.name,
    legalFrameworkRemoved: resolved.removed,
  };
}
