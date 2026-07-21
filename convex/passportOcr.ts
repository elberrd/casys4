"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { GoogleGenAI } from "@google/genai";

type PassportExtraction = {
  givenNames: string | null;
  middleName: string | null;
  surname: string | null;
  fullName: string | null;
  fatherName: string | null;
  motherName: string | null;
  passportNumber: string | null;
  sex: "Male" | "Female" | null;
  birthDate: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  nationality: string | null;
  nationalityCode: string | null;
  issuingCountry: string | null;
  issuingCountryCode: string | null;
  mrz: string | null;
};

type PassportMatch = {
  _id: Id<"people">;
  fullName: string;
  owned: boolean;
  givenNames: string;
  middleName: string | null;
  surname: string | null;
  birthYear: string | null;
  cpf: string | null;
  birthDate: string | null;
  email: string | null;
  sex: string | null;
  maritalStatus: string | null;
  fatherName: string | null;
  motherName: string | null;
  nationalityId: Id<"countries"> | null;
};

type ExtractPassportResult = {
  extracted: PassportExtraction;
  nationalityId: Id<"countries"> | null;
  issuingCountryId: Id<"countries"> | null;
  matches: PassportMatch[];
  passportExists: {
    isAvailable: boolean;
    existingPassport: {
      _id: Id<"passports">;
      passportNumber: string;
      personId: Id<"people"> | null;
      personName: string;
    } | null;
  } | null;
  error: "invalid_response" | null;
};

const nullableString = v.union(v.string(), v.null());

const passportExtractionValidator = v.object({
  givenNames: nullableString,
  middleName: nullableString,
  surname: nullableString,
  fullName: nullableString,
  fatherName: nullableString,
  motherName: nullableString,
  passportNumber: nullableString,
  sex: v.union(v.literal("Male"), v.literal("Female"), v.null()),
  birthDate: nullableString,
  issueDate: nullableString,
  expiryDate: nullableString,
  nationality: nullableString,
  nationalityCode: nullableString,
  issuingCountry: nullableString,
  issuingCountryCode: nullableString,
  mrz: nullableString,
});

const passportMatchValidator = v.object({
  _id: v.id("people"),
  fullName: v.string(),
  owned: v.boolean(),
  givenNames: v.string(),
  middleName: nullableString,
  surname: nullableString,
  birthYear: nullableString,
  cpf: nullableString,
  birthDate: nullableString,
  email: nullableString,
  sex: nullableString,
  maritalStatus: nullableString,
  fatherName: nullableString,
  motherName: nullableString,
  nationalityId: v.union(v.id("countries"), v.null()),
});

const passportExistsValidator = v.union(
  v.object({
    isAvailable: v.boolean(),
    existingPassport: v.union(
      v.object({
        _id: v.id("passports"),
        passportNumber: v.string(),
        personId: v.union(v.id("people"), v.null()),
        personName: v.string(),
      }),
      v.null(),
    ),
  }),
  v.null(),
);

const OCR_PROMPT = `Read the attached passport image or PDF and extract the requested passport fields. Preserve names and document numbers exactly as printed. Keep any separately printed middle name in middleName. Extract fatherName and motherName only when those names are explicitly printed on the document; never infer or invent parent names. Normalize dates to YYYY-MM-DD. Use the three-letter MRZ codes for nationalityCode and issuingCountryCode when available. If the document is not a passport, or a field is absent or unreadable, return null for that field.`;

const GEMINI_REQUEST_TIMEOUT_MS = 30_000;

const PASSPORT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    givenNames: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Given or first names exactly as printed",
    },
    middleName: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Separately printed middle name, otherwise null",
    },
    surname: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Family name or surname exactly as printed",
    },
    fullName: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Complete name exactly as printed",
    },
    fatherName: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Father's name only when explicitly printed",
    },
    motherName: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Mother's name only when explicitly printed",
    },
    passportNumber: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Passport document number",
    },
    sex: {
      anyOf: [{ type: "string", enum: ["Male", "Female"] }, { type: "null" }],
    },
    birthDate: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Date of birth in YYYY-MM-DD format",
    },
    issueDate: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Date of issue in YYYY-MM-DD format",
    },
    expiryDate: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Date of expiry in YYYY-MM-DD format",
    },
    nationality: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Nationality as printed",
    },
    nationalityCode: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Three-letter nationality code from the MRZ",
    },
    issuingCountry: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Issuing country or authority name",
    },
    issuingCountryCode: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Three-letter issuing-country code from the MRZ",
    },
    mrz: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Full machine-readable zone, preserving both lines",
    },
  },
  required: [
    "givenNames",
    "middleName",
    "surname",
    "fullName",
    "fatherName",
    "motherName",
    "passportNumber",
    "sex",
    "birthDate",
    "issueDate",
    "expiryDate",
    "nationality",
    "nationalityCode",
    "issuingCountry",
    "issuingCountryCode",
    "mrz",
  ],
  additionalProperties: false,
  propertyOrdering: [
    "givenNames",
    "middleName",
    "surname",
    "fullName",
    "fatherName",
    "motherName",
    "passportNumber",
    "sex",
    "birthDate",
    "issueDate",
    "expiryDate",
    "nationality",
    "nationalityCode",
    "issuingCountry",
    "issuingCountryCode",
    "mrz",
  ],
} as const;

const EMPTY_EXTRACTION: PassportExtraction = {
  givenNames: null,
  middleName: null,
  surname: null,
  fullName: null,
  fatherName: null,
  motherName: null,
  passportNumber: null,
  sex: null,
  birthDate: null,
  issueDate: null,
  expiryDate: null,
  nationality: null,
  nationalityCode: null,
  issuingCountry: null,
  issuingCountryCode: null,
  mrz: null,
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parsePassportExtraction(raw: string): PassportExtraction | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!cleaned) return null;

  let value: unknown;
  try {
    value = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const fields = value as Record<string, unknown>;
  const sex =
    fields.sex === "Male" || fields.sex === "Female" ? fields.sex : null;

  return {
    givenNames: asString(fields.givenNames),
    middleName: asString(fields.middleName),
    surname: asString(fields.surname),
    fullName: asString(fields.fullName),
    fatherName: asString(fields.fatherName),
    motherName: asString(fields.motherName),
    passportNumber: asString(fields.passportNumber),
    sex,
    birthDate: asString(fields.birthDate),
    issueDate: asString(fields.issueDate),
    expiryDate: asString(fields.expiryDate),
    nationality: asString(fields.nationality),
    nationalityCode: asString(fields.nationalityCode),
    issuingCountry: asString(fields.issuingCountry),
    issuingCountryCode: asString(fields.issuingCountryCode),
    mrz: asString(fields.mrz),
  };
}

/**
 * Extract passport fields from an uploaded file using Gemini (gemini-3.5-flash),
 * then resolve countries and detect possible existing-person / existing-passport
 * matches. Returns structured data for the request wizard to confirm before
 * creating the candidate.
 *
 * Runs in the Node.js runtime ("use node") to use the @google/genai SDK and
 * read the file bytes from Convex storage.
 */
export const extractPassport = action({
  args: {
    storageId: v.id("_storage"),
    recordForPersonCreation: v.optional(v.boolean()),
  },
  returns: v.object({
    extracted: passportExtractionValidator,
    nationalityId: v.union(v.id("countries"), v.null()),
    issuingCountryId: v.union(v.id("countries"), v.null()),
    matches: v.array(passportMatchValidator),
    passportExists: passportExistsValidator,
    error: v.union(v.literal("invalid_response"), v.null()),
  }),
  handler: async (
    ctx,
    { storageId, recordForPersonCreation },
  ): Promise<ExtractPassportResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("Uploaded file not found in storage");

    const mimeType = blob.type || "application/octet-stream";
    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured on the Convex deployment",
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: GEMINI_REQUEST_TIMEOUT_MS,
        // Retries are controlled by the callers so every attempt is visible to
        // the user. The SDK defaults to five silent attempts.
        retryOptions: { attempts: 1 },
      },
    });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { mimeType, data: base64 } },
        { text: OCR_PROMPT },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: PASSPORT_RESPONSE_SCHEMA,
      },
    });

    const raw = (response.text ?? "").trim();
    const parsed = parsePassportExtraction(raw);

    if (!parsed) {
      if (recordForPersonCreation) {
        await ctx.runMutation(internal.personPassportOcrVerifications.record, {
          storageId,
          passportNumber: null,
          verifiedBy: userId,
        });
      }
      return {
        extracted: EMPTY_EXTRACTION,
        nationalityId: null,
        issuingCountryId: null,
        matches: [],
        passportExists: null,
        error: "invalid_response",
      };
    }

    const resolveCountryId = async (
      code: string | null,
      name: string | null,
    ): Promise<Id<"countries"> | null> => {
      const codeLookup = asString(code);
      const nameLookup = asString(name);

      if (codeLookup) {
        const countryId: Id<"countries"> | null = await ctx.runQuery(
          api.countries.findByCodeOrName,
          { value: codeLookup },
        );
        if (countryId) return countryId;
      }

      if (nameLookup && nameLookup !== codeLookup) {
        return await ctx.runQuery(api.countries.findByCodeOrName, {
          value: nameLookup,
        });
      }

      return null;
    };

    // MRZ values use ISO alpha-3 codes (for example USA), while older country
    // rows may only have alpha-2 codes (US) and an empty iso3 field. Try the
    // OCR-provided country name when the code lookup cannot resolve the row.
    const [nationalityId, issuingCountryId] = await Promise.all([
      resolveCountryId(parsed.nationalityCode, parsed.nationality),
      resolveCountryId(parsed.issuingCountryCode, parsed.issuingCountry),
    ]);

    const fullName = asString(parsed.fullName);
    const matches = fullName
      ? await ctx.runQuery(api.people.findByNormalizedName, { fullName })
      : [];

    const passportNumber = asString(parsed.passportNumber);
    const passportExists = passportNumber
      ? await ctx.runQuery(api.passports.checkPassportNumberDuplicate, {
          passportNumber,
        })
      : null;

    if (recordForPersonCreation) {
      await ctx.runMutation(internal.personPassportOcrVerifications.record, {
        storageId,
        passportNumber,
        verifiedBy: userId,
      });
    }

    return {
      extracted: parsed,
      nationalityId,
      issuingCountryId,
      matches,
      passportExists,
      error: null,
    };
  },
});
