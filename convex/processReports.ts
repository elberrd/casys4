import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import type { Doc, Id } from "./_generated/dataModel";
import { resolveVisaReceiptPlace } from "../lib/process-reports/visa-receipt-place";

function getFullName(person: {
  givenNames: string;
  middleName?: string;
  surname?: string;
}): string {
  return [person.givenNames, person.middleName, person.surname]
    .filter(Boolean)
    .join(" ");
}

const declarationSourceValidator = v.object({
  candidateName: v.string(),
  sex: v.union(v.string(), v.null()),
  maritalStatus: v.union(v.string(), v.null()),
  birthDate: v.union(v.string(), v.null()),
  fatherName: v.union(v.string(), v.null()),
  motherName: v.union(v.string(), v.null()),
  nationalityName: v.union(v.string(), v.null()),
  nationalityCode: v.union(v.string(), v.null()),
  nationalityFullName: v.union(v.string(), v.null()),
  passportNumber: v.union(v.string(), v.null()),
  passportIssueDate: v.union(v.string(), v.null()),
  passportExpiryDate: v.union(v.string(), v.null()),
  issuingCountryName: v.union(v.string(), v.null()),
  issuingCountryCode: v.union(v.string(), v.null()),
  issuingCountryFullName: v.union(v.string(), v.null()),
  legalFrameworkName: v.union(v.string(), v.null()),
  cityName: v.union(v.string(), v.null()),
  stateCode: v.union(v.string(), v.null()),
});

async function countryFieldsFromId(
  ctx: QueryCtx,
  countryId: Id<"countries"> | undefined,
) {
  if (!countryId) {
    return { name: null, code: null, fullName: null };
  }
  const country = await ctx.db.get(countryId);
  if (!country) {
    return { name: null, code: null, fullName: null };
  }
  return {
    name: country.name,
    code: country.code || null,
    fullName: country.fullName ?? null,
  };
}

async function cityStateFromId(
  ctx: QueryCtx,
  cityId: Id<"cities"> | undefined,
): Promise<{ cityName: string | null; stateCode: string | null }> {
  if (!cityId) return { cityName: null, stateCode: null };
  const city = await ctx.db.get(cityId);
  if (!city) return { cityName: null, stateCode: null };

  let stateCode: string | null = null;
  if (city.stateId) {
    const state = await ctx.db.get(city.stateId);
    stateCode = state?.code?.trim() || state?.name || null;
  }

  return { cityName: city.name, stateCode };
}

async function cityStateFromConsulate(
  ctx: QueryCtx,
  consulateId: Id<"consulates"> | undefined,
): Promise<{ cityName: string | null; stateCode: string | null }> {
  if (!consulateId) return { cityName: null, stateCode: null };
  const consulate = await ctx.db.get(consulateId);
  return cityStateFromId(ctx, consulate?.cityId);
}

async function resolvePassport(
  ctx: QueryCtx,
  process: Doc<"individualProcesses">,
): Promise<Doc<"passports"> | null> {
  if (process.passportId) {
    const linked = await ctx.db.get(process.passportId);
    if (linked) return linked;
  }

  const passports = await ctx.db
    .query("passports")
    .withIndex("by_person", (q) => q.eq("personId", process.personId))
    .collect();

  if (passports.length === 0) return null;

  const active = passports.filter((passport) => passport.isActive !== false);
  const pool = active.length > 0 ? active : passports;
  pool.sort((a, b) => (b.expiryDate ?? "").localeCompare(a.expiryDate ?? ""));
  return pool[0] ?? null;
}

/**
 * Source fields for individual-process legal reports (admin only).
 */
export const getDeclarationSource = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  returns: v.union(declarationSourceValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const process = await ctx.db.get(args.individualProcessId);
    if (!process || process.requestStatus === "draft") return null;

    const [person, legalFramework, collectiveProcess, company] =
      await Promise.all([
        ctx.db.get(process.personId),
        process.legalFrameworkId ? ctx.db.get(process.legalFrameworkId) : null,
        process.collectiveProcessId
          ? ctx.db.get(process.collectiveProcessId)
          : null,
        process.companyApplicantId
          ? ctx.db.get(process.companyApplicantId)
          : null,
      ]);

    const passport = await resolvePassport(ctx, process);

    const [
      nationality,
      issuingCountry,
      consulatePlace,
      workplacePlace,
      companyPlace,
    ] = await Promise.all([
      countryFieldsFromId(ctx, person?.nationalityId),
      countryFieldsFromId(ctx, passport?.issuingCountryId),
      cityStateFromConsulate(ctx, process.consulateId),
      cityStateFromId(ctx, collectiveProcess?.workplaceCityId),
      cityStateFromId(ctx, company?.cityId),
    ]);

    const location = resolveVisaReceiptPlace({
      visaReceiptLocation: process.visaReceiptLocation ?? null,
      receivedInBrazil: legalFramework?.receivedInBrazil ?? null,
      consularPost: process.consularPost ?? null,
      consulate: consulatePlace,
      workplace: workplacePlace,
      company: companyPlace,
    });

    return {
      candidateName: person ? getFullName(person) : "",
      sex: person?.sex ?? null,
      maritalStatus: person?.maritalStatus ?? null,
      birthDate: person?.birthDate ?? null,
      fatherName: person?.fatherName ?? null,
      motherName: person?.motherName ?? null,
      nationalityName: nationality.name,
      nationalityCode: nationality.code,
      nationalityFullName: nationality.fullName,
      passportNumber: passport?.passportNumber ?? null,
      passportIssueDate: passport?.issueDate ?? null,
      passportExpiryDate: passport?.expiryDate ?? null,
      issuingCountryName: issuingCountry.name,
      issuingCountryCode: issuingCountry.code,
      issuingCountryFullName: issuingCountry.fullName,
      legalFrameworkName: legalFramework?.name ?? null,
      cityName: location.cityName,
      stateCode: location.stateCode,
    };
  },
});
