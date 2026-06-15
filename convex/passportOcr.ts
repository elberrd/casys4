"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { GoogleGenAI } from "@google/genai";

type PassportMatch = {
  _id: Id<"people">;
  fullName: string;
  givenNames: string;
  middleName: string | null;
  surname: string | null;
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
  extracted: Record<string, unknown>;
  nationalityId: Id<"countries"> | null;
  issuingCountryId: Id<"countries"> | null;
  matches: PassportMatch[];
  passportExists: {
    isAvailable: boolean;
    existingPassport: {
      _id: Id<"passports">;
      passportNumber: string;
      personName: string;
    } | null;
  } | null;
};

const OCR_PROMPT = `You are an expert passport OCR system. Read the attached passport (image or PDF) and extract its data.
Return ONLY a JSON object (no markdown, no commentary) with exactly these keys, using null when a value is not present or unreadable:
{
  "givenNames": string,          // given/first names exactly as printed
  "surname": string,             // family name / surname
  "fullName": string,            // complete name as printed (given + surname)
  "passportNumber": string,      // the document number
  "sex": "Male" | "Female" | null,
  "birthDate": string,           // date of birth, normalized to YYYY-MM-DD
  "issueDate": string,           // date of issue, normalized to YYYY-MM-DD
  "expiryDate": string,          // date of expiry, normalized to YYYY-MM-DD
  "nationality": string,         // nationality as printed
  "nationalityCode": string,     // 3-letter nationality code from the MRZ, if present
  "issuingCountry": string,      // issuing country/authority name
  "issuingCountryCode": string,  // 3-letter issuing-country code from the MRZ, if present
  "mrz": string                  // the full machine-readable zone lines, if present
}
All dates MUST be in YYYY-MM-DD format. If the document is not a passport, set all fields to null.`;

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
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }): Promise<ExtractPassportResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Authentication required");

    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("Uploaded file not found in storage");

    const mimeType = blob.type || "application/octet-stream";
    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured on the Convex deployment"
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { mimeType, data: base64 } },
        { text: OCR_PROMPT },
      ],
      config: { responseMimeType: "application/json" },
    });

    const raw = (response.text ?? "").trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    const asString = (val: unknown): string | null =>
      typeof val === "string" && val.trim() ? val.trim() : null;

    const nationalityLookup =
      asString(parsed.nationalityCode) ?? asString(parsed.nationality);
    const issuingLookup =
      asString(parsed.issuingCountryCode) ?? asString(parsed.issuingCountry);

    const [nationalityId, issuingCountryId] = await Promise.all([
      nationalityLookup
        ? ctx.runQuery(api.countries.findByCodeOrName, {
            value: nationalityLookup,
          })
        : Promise.resolve(null),
      issuingLookup
        ? ctx.runQuery(api.countries.findByCodeOrName, {
            value: issuingLookup,
          })
        : Promise.resolve(null),
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

    return {
      extracted: parsed,
      nationalityId,
      issuingCountryId,
      matches,
      passportExists,
    };
  },
});
