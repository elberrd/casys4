import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { Doc } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { normalizeString } from "./lib/stringUtils";

/**
 * Helper function to determine if the current user can access a specific document
 * Access rules:
 * - Admins can access all documents
 * - Clients can access documents if:
 *   1. Document is tied to their company (companyId matches)
 *   2. Document is tied to a person who belongs to their company (via peopleCompanies)
 */
async function canAccessDocument(
  ctx: QueryCtx | MutationCtx,
  document: Doc<"documents">
): Promise<boolean> {
  const userProfile = await getCurrentUserProfile(ctx);

  // Admins have full access
  if (userProfile.role === "admin") {
    return true;
  }

  // Client users need company assignment
  if (userProfile.role === "client") {
    if (!userProfile.companyId) {
      throw new Error("Client user must have a company assignment");
    }

    // Check if document is tied to client's company
    if (document.companyId && document.companyId === userProfile.companyId) {
      return true;
    }

    // Check if document is tied to a person who belongs to client's company
    if (document.personId) {
      const clientCompanyId = userProfile.companyId; // Assign to const for type narrowing
      const docPersonId = document.personId; // Assign to const for type narrowing
      const personCompany = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_person_company", (q) =>
          q.eq("personId", docPersonId).eq("companyId", clientCompanyId)
        )
        .first();

      if (personCompany) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Query to list all documents with optional filters
 * Access control: Admins see all documents, clients see only their company's documents
 */
export const list = query({
  args: {
    documentTypeId: v.optional(v.id("documentTypes")),
    personId: v.optional(v.id("people")),
    companyId: v.optional(v.id("companies")),
    individualProcessId: v.optional(v.id("individualProcesses")),
    userApplicantId: v.optional(v.id("people")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user profile for access control
    const userProfile = await getCurrentUserProfile(ctx);

    let documents = await ctx.db.query("documents").collect();

    // Filter by documentTypeId if provided
    if (args.documentTypeId !== undefined) {
      documents = documents.filter((d) => d.documentTypeId === args.documentTypeId);
    }

    // Filter by personId if provided
    if (args.personId !== undefined) {
      documents = documents.filter((d) => d.personId === args.personId);
    }

    // Filter by companyId if provided
    if (args.companyId !== undefined) {
      documents = documents.filter((d) => d.companyId === args.companyId);
    }

    // Filter by individualProcessId if provided
    if (args.individualProcessId !== undefined) {
      documents = documents.filter((d) => d.individualProcessId === args.individualProcessId);
    }

    // Filter by userApplicantId if provided
    if (args.userApplicantId !== undefined) {
      documents = documents.filter((d) => d.userApplicantId === args.userApplicantId);
    }

    // Apply role-based access control
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Get all people associated with client's company
      const clientCompanyId = userProfile.companyId; // Assign to const for type narrowing
      const companyPeople = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_company", (q) => q.eq("companyId", clientCompanyId))
        .collect();

      const allowedPersonIds = new Set(companyPeople.map((pc) => pc.personId));

      // Filter documents: keep only those tied to client's company or company's people
      documents = documents.filter((doc) => {
        // Document is tied to client's company
        if (doc.companyId && doc.companyId === userProfile.companyId) {
          return true;
        }
        // Document is tied to a person from client's company
        if (doc.personId && allowedPersonIds.has(doc.personId)) {
          return true;
        }
        return false;
      });
    }

    // Fetch related data for each document
    const documentsWithRelations = await Promise.all(
      documents.map(async (doc) => {
        const documentType = doc.documentTypeId ? await ctx.db.get(doc.documentTypeId) : null;
        const person = doc.personId ? await ctx.db.get(doc.personId) : null;
        const company = doc.companyId ? await ctx.db.get(doc.companyId) : null;
        const userApplicant = doc.userApplicantId ? await ctx.db.get(doc.userApplicantId) : null;

        // Fetch individual process with person name
        let individualProcess = null;
        if (doc.individualProcessId) {
          const process = await ctx.db.get(doc.individualProcessId);
          if (process) {
            const processPerson = await ctx.db.get(process.personId);
            const collectiveProcess = process.collectiveProcessId
              ? await ctx.db.get(process.collectiveProcessId)
              : null;
            individualProcess = {
              _id: process._id,
              personName: processPerson?.fullName || "Unknown",
              referenceNumber: collectiveProcess?.referenceNumber || null,
            };
          }
        }

        // Get file URL if storageId exists
        let fileUrl = doc.fileUrl;
        if (doc.storageId) {
          fileUrl = (await ctx.storage.getUrl(doc.storageId)) ?? undefined;
        }

        return {
          ...doc,
          documentType: documentType
            ? { _id: documentType._id, name: documentType.name, category: documentType.category }
            : null,
          person: person ? { _id: person._id, fullName: person.fullName } : null,
          company: company ? { _id: company._id, name: company.name } : null,
          individualProcess,
          userApplicant: userApplicant ? { _id: userApplicant._id, fullName: userApplicant.fullName } : null,
          fileUrl,
        };
      })
    );

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      return documentsWithRelations.filter((doc) => {
        const fileName = doc.fileName ? normalizeString(doc.fileName) : "";
        const documentTypeName = doc.documentType?.name ? normalizeString(doc.documentType.name) : "";

        return (
          fileName.includes(searchNormalized) ||
          documentTypeName.includes(searchNormalized)
        );
      });
    }

    return documentsWithRelations;
  },
});

/**
 * Query to get a single document by ID
 * Access control: Admins can view any document, clients can only view their company's documents
 */
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) return null;

    // Check access permissions
    const hasAccess = await canAccessDocument(ctx, document);
    if (!hasAccess) {
      throw new Error(
        "Access denied: You do not have permission to view this document"
      );
    }

    const documentType = document.documentTypeId ? await ctx.db.get(document.documentTypeId) : null;
    const person = document.personId ? await ctx.db.get(document.personId) : null;
    const company = document.companyId ? await ctx.db.get(document.companyId) : null;
    const userApplicant = document.userApplicantId ? await ctx.db.get(document.userApplicantId) : null;

    // Fetch individual process with person name
    let individualProcess = null;
    if (document.individualProcessId) {
      const process = await ctx.db.get(document.individualProcessId);
      if (process) {
        const processPerson = await ctx.db.get(process.personId);
        const collectiveProcess = process.collectiveProcessId
          ? await ctx.db.get(process.collectiveProcessId)
          : null;
        individualProcess = {
          _id: process._id,
          personName: processPerson?.fullName || "Unknown",
          referenceNumber: collectiveProcess?.referenceNumber || null,
        };
      }
    }

    // Get file URL if storageId exists
    let fileUrl = document.fileUrl;
    if (document.storageId) {
      fileUrl = (await ctx.storage.getUrl(document.storageId)) ?? undefined;
    }

    return {
      ...document,
      documentType: documentType
        ? { _id: documentType._id, name: documentType.name, category: documentType.category }
        : null,
      person: person ? { _id: person._id, fullName: person.fullName } : null,
      company: company ? { _id: company._id, name: company.name } : null,
      individualProcess,
      userApplicant: userApplicant ? { _id: userApplicant._id, fullName: userApplicant.fullName } : null,
      fileUrl,
    };
  },
});

/**
 * Mutation to generate upload URL for file (admin only)
 */
export const generateUploadUrl = mutation(async (ctx) => {
  // Require admin role
  await requireAdmin(ctx);

  return await ctx.storage.generateUploadUrl();
});

/**
 * Mutation to create a new document (admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    documentTypeId: v.id("documentTypes"),
    personId: v.optional(v.id("people")),
    companyId: v.optional(v.id("companies")),
    individualProcessId: v.optional(v.id("individualProcesses")),
    userApplicantId: v.optional(v.id("people")),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileType: v.optional(v.string()),
    notes: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const now = Date.now();

    // Get file URL if storageId exists
    let fileUrl: string | undefined = undefined;
    if (args.storageId) {
      fileUrl = (await ctx.storage.getUrl(args.storageId)) ?? undefined;
    }

    const documentId = await ctx.db.insert("documents", {
      name: args.name,
      documentTypeId: args.documentTypeId,
      personId: args.personId,
      companyId: args.companyId,
      individualProcessId: args.individualProcessId,
      userApplicantId: args.userApplicantId,
      storageId: args.storageId,
      fileUrl,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      notes: args.notes,
      issueDate: args.issueDate,
      expiryDate: args.expiryDate,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return documentId;
  },
});

/**
 * Mutation to update a document (admin only)
 */
export const update = mutation({
  args: {
    id: v.id("documents"),
    name: v.string(),
    documentTypeId: v.id("documentTypes"),
    personId: v.optional(v.id("people")),
    companyId: v.optional(v.id("companies")),
    individualProcessId: v.optional(v.id("individualProcesses")),
    userApplicantId: v.optional(v.id("people")),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileType: v.optional(v.string()),
    notes: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const { id, ...updates } = args;
    const now = Date.now();

    // Get the existing document
    const existingDoc = await ctx.db.get(id);
    if (!existingDoc) {
      throw new Error("Document not found");
    }

    // If storageId changed, delete old file if it exists
    if (existingDoc.storageId && args.storageId !== existingDoc.storageId) {
      await ctx.storage.delete(existingDoc.storageId);
    }

    // Get file URL if storageId exists
    let fileUrl: string | undefined = undefined;
    if (args.storageId) {
      fileUrl = (await ctx.storage.getUrl(args.storageId)) ?? undefined;
    }

    await ctx.db.patch(id, {
      ...updates,
      isActive: updates.isActive ?? true,
      fileUrl,
      updatedAt: now,
    });

    return id;
  },
});

/**
 * Mutation to delete a document (admin only)
 */
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Delete file from storage if exists
    if (document.storageId) {
      await ctx.storage.delete(document.storageId);
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

/**
 * Mutation to bulk delete documents (admin only)
 */
export const bulkRemove = mutation({
  args: { ids: v.array(v.id("documents")) },
  handler: async (ctx, args) => {
    // Require admin role
    await requireAdmin(ctx);

    for (const id of args.ids) {
      const document = await ctx.db.get(id);
      if (document) {
        // Delete file from storage if exists
        if (document.storageId) {
          await ctx.storage.delete(document.storageId);
        }
        await ctx.db.delete(id);
      }
    }
    return args.ids;
  },
});
