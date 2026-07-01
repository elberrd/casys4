import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { getClientCurrentCompanyIds } from "./auth";

/**
 * Person-level PII fields a client may edit through the request wizard. The
 * gating below decides whether a caller may READ their current values and
 * OVERWRITE them, or only fill gaps.
 */
type GatedPerson = Pick<
  Doc<"people">,
  "email" | "maritalStatus" | "fatherName" | "motherName"
>;

/**
 * Whether the given user "owns" a person — i.e. may see and overwrite that
 * person's PII. Privileged roles (admins / non-clients) always own. A client
 * owns a person they created, or one who is a CURRENT member of one of their
 * companies. A cross-tenant dedup match (same exact name, another organization)
 * is NOT owned: the client may link to it but its PII stays protected.
 *
 * Read-only (accepts QueryCtx or MutationCtx).
 */
export async function personOwnedByClient(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"userProfiles">,
  personId: Id<"people">,
  opts?: {
    /** Pre-resolved current company ids (pass once per request to avoid N+1). */
    currentCompanyIds?: Set<Id<"companies">>;
    /** Pre-fetched person doc to avoid a redundant read. */
    person?: Doc<"people"> | null;
  }
): Promise<boolean> {
  if (profile.role !== "client") return true;

  const person =
    opts?.person !== undefined ? opts.person : await ctx.db.get(personId);
  if (!person) return false;
  if (person.createdBy && person.createdBy === profile.userId) return true;

  const companyIds =
    opts?.currentCompanyIds ?? (await getClientCurrentCompanyIds(ctx, profile));
  if (companyIds.size === 0) return false;

  const links = await ctx.db
    .query("peopleCompanies")
    .withIndex("by_person", (q) => q.eq("personId", personId))
    .collect();
  return links.some(
    (l) => l.isCurrent && l.companyId && companyIds.has(l.companyId)
  );
}

/**
 * Presence flags describe which PII fields a person ALREADY has filled, WITHOUT
 * disclosing the values. Safe to return for cross-tenant people: the UI uses
 * them to lock already-populated fields (protected) while leaving empty ones
 * editable (gap-fill), mirroring the backend's fill-gaps write rule.
 */
export interface PersonPresence {
  hasEmail: boolean;
  hasMaritalStatus: boolean;
  hasFatherName: boolean;
  hasMotherName: boolean;
}

export interface GatedPersonPII {
  /** Owned: the real value. Not owned: null (withheld). */
  email: string | null;
  maritalStatus: string | null;
  fatherName: string | null;
  motherName: string | null;
  presence: PersonPresence;
}

/**
 * Project a person's PII for a caller: real values when `owned`, otherwise null.
 * Presence flags are always returned (they leak no value, only whether a field
 * is filled) so the client can distinguish "empty → you may complete" from
 * "already filled → protected".
 */
export function gatePersonPII(
  person: GatedPerson,
  owned: boolean
): GatedPersonPII {
  return {
    email: owned ? (person.email ?? null) : null,
    maritalStatus: owned ? (person.maritalStatus ?? null) : null,
    fatherName: owned ? (person.fatherName ?? null) : null,
    motherName: owned ? (person.motherName ?? null) : null,
    presence: {
      hasEmail: Boolean(person.email),
      hasMaritalStatus: Boolean(person.maritalStatus),
      hasFatherName: Boolean(person.fatherName),
      hasMotherName: Boolean(person.motherName),
    },
  };
}
