import { query } from "../_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { checkDocumentValidity, ValidityCheckResult } from "./documentValidity";

/** Constructs full display name from person name parts */
function getFullName(person: { givenNames: string; middleName?: string; surname?: string }): string {
  return [person.givenNames, person.middleName, person.surname].filter(Boolean).join(" ");
}

/**
 * Unified query that returns the complete requirements checklist for an individual process.
 * Combines document requirements (from documentTypesLegalFrameworks) with
 * standalone info requirements (from legalFrameworkInfoRequirements).
 */
export const getChecklist = query({
  args: {
    individualProcessId: v.id("individualProcesses"),
  },
  handler: async (ctx, args) => {
    // 1. Get the individual process
    const process = await ctx.db.get(args.individualProcessId);
    if (!process) {
      throw new Error("Individual process not found");
    }

    if (!process.legalFrameworkId) {
      return { items: [], summary: { total: 0, completed: 0, partial: 0, pending: 0 } };
    }

    // 2. Load related entities
    const person = await ctx.db.get(process.personId);
    if (!person) {
      throw new Error("Person not found");
    }

    const passport = process.passportId
      ? await ctx.db.get(process.passportId)
      : null;

    // Get company from collective process or applicant
    let company: Doc<"companies"> | null = null;
    if (process.companyApplicantId) {
      company = await ctx.db.get(process.companyApplicantId);
    } else if (process.collectiveProcessId) {
      const collective = await ctx.db.get(process.collectiveProcessId);
      if (collective?.companyId) {
        company = await ctx.db.get(collective.companyId);
      }
    }

    // 3. Get document requirements for this legal framework
    const docAssociations = await ctx.db
      .query("documentTypesLegalFrameworks")
      .withIndex("by_legalFramework", (q) =>
        q.eq("legalFrameworkId", process.legalFrameworkId!)
      )
      .collect();

    // 4. Get standalone info requirements for this legal framework
    const infoRequirements = await ctx.db
      .query("legalFrameworkInfoRequirements")
      .withIndex("by_legalFramework", (q) =>
        q.eq("legalFrameworkId", process.legalFrameworkId!)
      )
      .collect();

    const activeInfoReqs = infoRequirements.filter((r) => r.isActive);

    // 5. Build document checklist items
    const documentItems = await Promise.all(
      docAssociations.map(async (assoc) => {
        const documentType = await ctx.db.get(assoc.documentTypeId);
        if (!documentType || documentType.isActive === false) return null;

        // Get field mappings for this document type
        const fieldMappings = await ctx.db
          .query("documentTypeFieldMappings")
          .withIndex("by_documentType", (q) =>
            q.eq("documentTypeId", assoc.documentTypeId)
          )
          .collect();

        const activeFieldMappings = fieldMappings
          .filter((m) => m.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        // Get delivered document (latest version)
        const deliveredDocs = await ctx.db
          .query("documentsDelivered")
          .withIndex("by_individualProcess", (q) =>
            q.eq("individualProcessId", args.individualProcessId)
          )
          .collect();

        const latestDoc = deliveredDocs.find(
          (d) => d.documentTypeId === assoc.documentTypeId && d.isLatest
        );

        // Get conditions for delivered document
        let conditions: any[] = [];
        if (latestDoc) {
          const docConditions = await ctx.db
            .query("documentDeliveredConditions")
            .withIndex("by_documentDelivered", (q) =>
              q.eq("documentsDeliveredId", latestDoc._id)
            )
            .collect();

          conditions = await Promise.all(
            docConditions.map(async (dc) => {
              const condition = await ctx.db.get(dc.documentTypeConditionId);
              return {
                name: condition?.name ?? "",
                isFulfilled: dc.isFulfilled,
                expiresAt: dc.expiresAt,
              };
            })
          );
        }

        // Compute validity check
        let validityCheck: ValidityCheckResult | undefined;
        if (assoc.validityType && assoc.validityDays && latestDoc) {
          validityCheck = checkDocumentValidity(
            assoc.validityType,
            assoc.validityDays,
            latestDoc.issueDate,
            latestDoc.expiryDate,
          );
        }

        // Evaluate info fields
        const infoFields = activeFieldMappings.map((mapping) => {
          const currentValue = getFieldValue(
            mapping.entityType,
            mapping.fieldPath,
            person,
            process,
            passport,
            company
          );

          return {
            entityType: mapping.entityType,
            fieldPath: mapping.fieldPath,
            label: mapping.label,
            labelEn: mapping.labelEn,
            fieldType: mapping.fieldType ?? "text",
            currentValue,
            isFilled: currentValue !== null && currentValue !== undefined && currentValue !== "",
          };
        });

        const hasInfoFields = activeFieldMappings.length > 0;
        const allInfoFilled = infoFields.every((f) => f.isFilled);
        const hasDocument = latestDoc && latestDoc.status !== "not_started" && latestDoc.status !== "pending_upload";
        const allConditionsMet = conditions.length === 0 || conditions.every((c) => c.isFulfilled);
        const validityOk = !validityCheck || validityCheck.status === "valid" || validityCheck.status === "no_rule";

        let completionStatus: "completed" | "partial" | "pending" = "pending";
        if (hasInfoFields && hasDocument) {
          if (allInfoFilled && allConditionsMet && validityOk) completionStatus = "completed";
          else completionStatus = "partial";
        } else if (hasDocument && allConditionsMet && validityOk && !hasInfoFields) {
          completionStatus = "completed";
        } else if (hasInfoFields && allInfoFilled && !hasDocument) {
          // Doc not uploaded yet but info filled
          completionStatus = "partial";
        } else if (hasDocument || infoFields.some((f) => f.isFilled)) {
          completionStatus = "partial";
        }

        return {
          type: hasInfoFields ? "document_with_info" as const : "document" as const,
          label: documentType.name,
          sortOrder: assoc.sortOrder ?? 999,
          responsibleParty: assoc.responsibleParty ?? "client",
          isRequired: assoc.isRequired,
          completionStatus,
          document: {
            documentTypeId: assoc.documentTypeId,
            documentTypeName: documentType.name,
            documentTypeCode: documentType.code,
            workflowType: assoc.workflowType ?? "upload",
            validityDays: assoc.validityDays,
            validityType: assoc.validityType,
            validityCheck,
            deliveredDocument: latestDoc
              ? {
                  _id: latestDoc._id,
                  status: latestDoc.status,
                  fileName: latestDoc.fileName,
                  uploadedAt: latestDoc.uploadedAt,
                }
              : undefined,
            conditions,
          },
          infoFields: hasInfoFields ? infoFields : undefined,
        };
      })
    );

    // 6. Build standalone info checklist items
    const standaloneInfoItems = await Promise.all(
      activeInfoReqs.map(async (req) => {
        const currentValue = getFieldValue(
          req.entityType,
          req.fieldPath,
          person,
          process,
          passport,
          company
        );

        const isFilled = currentValue !== null && currentValue !== undefined && currentValue !== "";

        // Check if there's a document type linked to this field via field mappings
        const linkedMappings = await ctx.db
          .query("documentTypeFieldMappings")
          .withIndex("by_entityType_fieldPath", (q) =>
            q.eq("entityType", req.entityType).eq("fieldPath", req.fieldPath)
          )
          .collect();

        const activeLinkMapping = linkedMappings.find((m) => m.isActive);
        let linkedDocumentType: { documentTypeId: Id<"documentTypes">; name: string } | undefined;
        if (activeLinkMapping) {
          const docType = await ctx.db.get(activeLinkMapping.documentTypeId);
          if (docType) {
            linkedDocumentType = {
              documentTypeId: docType._id,
              name: docType.name,
            };
          }
        }

        return {
          type: "info" as const,
          label: req.label,
          sortOrder: req.sortOrder,
          responsibleParty: req.responsibleParty,
          isRequired: req.isRequired,
          completionStatus: isFilled ? "completed" as const : "pending" as const,
          infoFields: [
            {
              entityType: req.entityType,
              fieldPath: req.fieldPath,
              label: req.label,
              labelEn: req.labelEn,
              fieldType: req.fieldType ?? "text",
              currentValue,
              isFilled,
            },
          ],
          linkedDocumentType,
        };
      })
    );

    // 7. Combine and sort
    const allItems = [
      ...documentItems.filter((i): i is NonNullable<typeof i> => i !== null),
      ...standaloneInfoItems,
    ].sort((a, b) => a.sortOrder - b.sortOrder);

    // 8. Calculate summary
    const total = allItems.length;
    const completed = allItems.filter((i) => i.completionStatus === "completed").length;
    const partial = allItems.filter((i) => i.completionStatus === "partial").length;
    const pending = allItems.filter((i) => i.completionStatus === "pending").length;

    return {
      items: allItems,
      summary: { total, completed, partial, pending },
    };
  },
});

/**
 * Helper to extract a field value from the appropriate entity
 */
function getFieldValue(
  entityType: string,
  fieldPath: string,
  person: Doc<"people">,
  process: Doc<"individualProcesses">,
  passport: Doc<"passports"> | null,
  company: Doc<"companies"> | null
): any {
  switch (entityType) {
    case "person":
      return (person as any)[fieldPath] ?? null;
    case "individualProcess":
      return (process as any)[fieldPath] ?? null;
    case "passport":
      if (!passport) return null;
      return (passport as any)[fieldPath] ?? null;
    case "company":
      if (!company) return null;
      return (company as any)[fieldPath] ?? null;
    default:
      return null;
  }
}
