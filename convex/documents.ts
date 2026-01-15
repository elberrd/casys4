import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
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
    const userProfile = await requireAdmin(ctx);

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

    // Log activity
    if (userProfile.userId) {
      const documentType = await ctx.db.get(args.documentTypeId);
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "documents",
        entityId: documentId,
        details: {
          name: args.name,
          fileName: args.fileName,
          documentType: documentType?.name,
        },
      });
    }

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
    const userProfile = await requireAdmin(ctx);

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

    // Log activity
    if (userProfile.userId) {
      const documentType = await ctx.db.get(args.documentTypeId);
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "updated",
        entityType: "documents",
        entityId: id,
        details: {
          name: args.name,
          fileName: args.fileName,
          documentType: documentType?.name,
        },
      });
    }

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
    const userProfile = await requireAdmin(ctx);

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Delete file from storage if exists
    if (document.storageId) {
      await ctx.storage.delete(document.storageId);
    }

    await ctx.db.delete(args.id);

    // Log activity
    if (userProfile.userId) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "deleted",
        entityType: "documents",
        entityId: args.id,
        details: {
          name: document.name,
          fileName: document.fileName,
        },
      });
    }

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
    const userProfile = await requireAdmin(ctx);

    const deletedDocuments: { id: string; name: string; fileName?: string }[] = [];

    for (const id of args.ids) {
      const document = await ctx.db.get(id);
      if (document) {
        deletedDocuments.push({ id, name: document.name, fileName: document.fileName });
        // Delete file from storage if exists
        if (document.storageId) {
          await ctx.storage.delete(document.storageId);
        }
        await ctx.db.delete(id);
      }
    }

    // Log activity
    if (userProfile.userId && deletedDocuments.length > 0) {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "bulk_deleted",
        entityType: "documents",
        entityId: "bulk",
        details: {
          count: deletedDocuments.length,
          documents: deletedDocuments,
        },
      });
    }

    return args.ids;
  },
});
