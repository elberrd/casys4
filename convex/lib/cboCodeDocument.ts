/**
 * Builds a CBO document with only schema fields.
 * Empty strings are omitted so Convex replace/insert never writes undefined
 * and leftover extra fields on old documents are dropped on replace.
 */
export type CboCodeFields = {
  code?: string;
  title: string;
  activity?: string;
  description?: string;
};

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildCboCodeDocument(input: CboCodeFields): CboCodeFields {
  const document: CboCodeFields = { title: input.title.trim() };

  const code = optionalText(input.code);
  if (code) document.code = code;

  const activity = optionalText(input.activity);
  if (activity) document.activity = activity;

  const description = optionalText(input.description);
  if (description) document.description = description;

  return document;
}

export function mergeCboCodeDocument(
  current: CboCodeFields,
  args: CboCodeFields,
): CboCodeFields {
  return buildCboCodeDocument({
    code: args.code !== undefined ? args.code : current.code,
    title: args.title,
    activity: args.activity !== undefined ? args.activity : current.activity,
    description:
      args.description !== undefined ? args.description : current.description,
  });
}
