import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Returns the process-level CBO activities copy.
 * Explicit text wins; otherwise copies the selected CBO's master activity.
 */
export async function resolveCboActivities(
  ctx: MutationCtx,
  cboId: Id<"cboCodes"> | undefined,
  explicit?: string,
): Promise<string | undefined> {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  if (!cboId) return undefined;
  const cbo = await ctx.db.get(cboId);
  const activity = cbo?.activity?.trim();
  return activity ? activity : undefined;
}
