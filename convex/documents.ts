import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUserProfile, requireAdmin } from "./lib/auth";
import { Doc } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { normalizeString } from "./lib/stringUtils";

function getFullName(person: { givenNames?: string; fullName?: string; middleName?: string; surname?: string }): string {
  return [person.givenNames || person.fullName || "", person.middleName, person.surname].filter(Boolean).join(" ");
}

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
 * Includes both standalone documents (documents table) and process documents (documentsDelivered table)
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

    // Fetch documents from both tables (only latest versions for standalone docs)
    let documents = await ctx.db.query("documents").collect();
    documents = documents.filter((d) => d.isLatest !== false); // treat undefined as true
    let deliveredDocuments = await ctx.db.query("documentsDelivered").collect();

    // Filter by documentTypeId if provided
    if (args.documentTypeId !== undefined) {
      documents = documents.filter((d) => d.documentTypeId === args.documentTypeId);
      deliveredDocuments = deliveredDocuments.filter((d) => d.documentTypeId === args.documentTypeId);
    }

    // Filter by personId if provided
    if (args.personId !== undefined) {
      documents = documents.filter((d) => d.personId === args.personId);
      deliveredDocuments = deliveredDocuments.filter((d) => d.personId === args.personId);
    }

    // Filter by companyId if provided
    if (args.companyId !== undefined) {
      documents = documents.filter((d) => d.companyId === args.companyId);
      // documentsDelivered doesn't have companyId directly, filter via individualProcess later
    }

    // Filter by individualProcessId if provided
    if (args.individualProcessId !== undefined) {
      documents = documents.filter((d) => d.individualProcessId === args.individualProcessId);
      deliveredDocuments = deliveredDocuments.filter((d) => d.individualProcessId === args.individualProcessId);
    }

    // Filter by userApplicantId if provided
    if (args.userApplicantId !== undefined) {
      documents = documents.filter((d) => d.userApplicantId === args.userApplicantId);
      // documentsDelivered doesn't have userApplicantId
    }

    // Apply role-based access control
    let allowedPersonIds: Set<Id<"people">> | null = null;
    if (userProfile.role === "client") {
      if (!userProfile.companyId) {
        throw new Error("Client user must have a company assignment");
      }

      // Get all people associated with client's company
      const clientCompanyId = userProfile.companyId;
      const companyPeople = await ctx.db
        .query("peopleCompanies")
        .withIndex("by_company", (q) => q.eq("companyId", clientCompanyId))
        .collect();

      allowedPersonIds = new Set(companyPeople.map((pc) => pc.personId).filter((id): id is Id<"people"> => id !== undefined));

      // Filter standalone documents
      documents = documents.filter((doc) => {
        if (doc.companyId && doc.companyId === userProfile.companyId) {
          return true;
        }
        if (doc.personId && allowedPersonIds!.has(doc.personId)) {
          return true;
        }
        return false;
      });

      // Filter delivered documents by person
      deliveredDocuments = deliveredDocuments.filter((doc) => {
        if (doc.personId && allowedPersonIds!.has(doc.personId)) {
          return true;
        }
        return false;
      });
    }

    // Fetch related data for standalone documents
    const standaloneDocsWithRelations = await Promise.all(
      documents.map(async (doc) => {
        const documentType = doc.documentTypeId ? await ctx.db.get(doc.documentTypeId) : null;
        const person = doc.personId ? await ctx.db.get(doc.personId) : null;
        const company = doc.companyId ? await ctx.db.get(doc.companyId) : null;
        const userApplicant = doc.userApplicantId ? await ctx.db.get(doc.userApplicantId) : null;

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
              personName: processPerson ? getFullName(processPerson) : "Unknown",
              referenceNumber: collectiveProcess?.referenceNumber || null,
            };
          }
        }

        let fileUrl = doc.fileUrl;
        if (doc.storageId) {
          fileUrl = (await ctx.storage.getUrl(doc.storageId)) ?? undefined;
        }

        return {
          ...doc,
          source: "documents" as const,
          documentType: documentType
            ? { _id: documentType._id, name: documentType.name, category: documentType.category }
            : null,
          person: person ? { _id: person._id, fullName: getFullName(person) } : null,
          company: company ? { _id: company._id, name: company.name } : null,
          individualProcess,
          userApplicant: userApplicant ? { _id: userApplicant._id, fullName: getFullName(userApplicant) } : null,
          fileUrl,
        };
      })
    );

    // Fetch related data for delivered documents (only latest versions)
    const latestDeliveredDocs = deliveredDocuments.filter((d) => d.isLatest);
    const deliveredDocsWithRelations = await Promise.all(
      latestDeliveredDocs.map(async (doc) => {
        const documentType = doc.documentTypeId ? await ctx.db.get(doc.documentTypeId) : null;
        const person = doc.personId ? await ctx.db.get(doc.personId) : null;

        let individualProcess = null;
        let company = null;
        if (doc.individualProcessId) {
          const process = await ctx.db.get(doc.individualProcessId);
          if (process) {
            const processPerson = await ctx.db.get(process.personId);
            const collectiveProcess = process.collectiveProcessId
              ? await ctx.db.get(process.collectiveProcessId)
              : null;

            // Get company from collective process
            if (collectiveProcess?.companyId) {
              const companyData = await ctx.db.get(collectiveProcess.companyId);
              company = companyData ? { _id: companyData._id, name: companyData.name } : null;
            }

            individualProcess = {
              _id: process._id,
              personName: processPerson ? getFullName(processPerson) : "Unknown",
              referenceNumber: collectiveProcess?.referenceNumber || null,
            };
          }
        }

        let fileUrl: string | undefined = doc.fileUrl ?? undefined;
        if (doc.storageId) {
          fileUrl = (await ctx.storage.getUrl(doc.storageId)) ?? undefined;
        }

        return {
          _id: doc._id,
          _creationTime: doc._creationTime,
          name: doc.fileName || "Documento sem nome",
          source: "documentsDelivered" as const,
          documentTypeId: doc.documentTypeId,
          personId: doc.personId,
          companyId: null as Id<"companies"> | null,
          individualProcessId: doc.individualProcessId,
          userApplicantId: null as Id<"people"> | null,
          storageId: doc.storageId,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          fileType: doc.mimeType,
          notes: null as string | null,
          issueDate: null as string | null,
          expiryDate: null as string | null,
          isActive: true,
          createdAt: doc.uploadedAt,
          updatedAt: doc.uploadedAt,
          status: doc.status,
          documentType: documentType
            ? { _id: documentType._id, name: documentType.name, category: documentType.category }
            : null,
          person: person ? { _id: person._id, fullName: getFullName(person) } : null,
          company,
          individualProcess,
          userApplicant: null,
          fileUrl,
        };
      })
    );

    // Combine both document sources
    const allDocuments = [...standaloneDocsWithRelations, ...deliveredDocsWithRelations];

    // Sort by creation time descending
    allDocuments.sort((a, b) => (b.createdAt || b._creationTime) - (a.createdAt || a._creationTime));

    // Apply search filter
    if (args.search) {
      const searchNormalized = normalizeString(args.search);
      return allDocuments.filter((doc) => {
        const fileName = doc.fileName ? normalizeString(doc.fileName) : "";
        const documentTypeName = doc.documentType?.name ? normalizeString(doc.documentType.name) : "";
        const name = doc.name ? normalizeString(doc.name) : "";

        return (
          fileName.includes(searchNormalized) ||
          documentTypeName.includes(searchNormalized) ||
          name.includes(searchNormalized)
        );
      });
    }

    return allDocuments;
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
          personName: processPerson ? getFullName(processPerson) : "Unknown",
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
      person: person ? { _id: person._id, fullName: getFullName(person) } : null,
      company: company ? { _id: company._id, name: company.name } : null,
      individualProcess,
      userApplicant: userApplicant ? { _id: userApplicant._id, fullName: getFullName(userApplicant) } : null,
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

    // Note: We no longer delete old storage files when storageId changes.
    // Use uploadNewVersion for file replacements to preserve version history.

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

/**
 * Mutation to upload a new version of a standalone document (admin only)
 * Creates a new document record linked to the original via originalDocumentId
 */
export const uploadNewVersion = mutation({
  args: {
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    versionNotes: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existingDoc = await ctx.db.get(args.documentId);
    if (!existingDoc) {
      throw new Error("Document not found");
    }

    const now = Date.now();

    // Determine the original document ID for grouping versions
    const originalDocumentId = existingDoc.originalDocumentId || existingDoc._id;

    // If the original document doesn't have version fields, backfill them
    if (existingDoc.version === undefined) {
      await ctx.db.patch(existingDoc._id, {
        version: 1,
        isLatest: false,
        originalDocumentId: originalDocumentId,
      });
    } else {
      // Mark current document as not latest
      await ctx.db.patch(existingDoc._id, { isLatest: false });
    }

    // Find all versions to calculate next version number
    const allVersions = await ctx.db
      .query("documents")
      .withIndex("by_originalDocument", (q) => q.eq("originalDocumentId", originalDocumentId))
      .collect();

    // Include the original doc itself if it's the root
    const originalDoc = await ctx.db.get(originalDocumentId);
    const existingVersions = allVersions.map((d) => d.version || 1);
    if (originalDoc && !allVersions.some((d) => d._id === originalDocumentId)) {
      existingVersions.push(originalDoc.version || 1);
    }
    const maxVersion = existingVersions.length > 0 ? Math.max(...existingVersions) : 1;
    const newVersion = maxVersion + 1;

    // Get file URL
    const fileUrl = (await ctx.storage.getUrl(args.storageId)) ?? undefined;

    // Create new version document
    const newDocId = await ctx.db.insert("documents", {
      name: existingDoc.name,
      documentTypeId: existingDoc.documentTypeId,
      personId: existingDoc.personId,
      companyId: existingDoc.companyId,
      individualProcessId: existingDoc.individualProcessId,
      userApplicantId: existingDoc.userApplicantId,
      storageId: args.storageId,
      fileUrl,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      notes: existingDoc.notes,
      issueDate: existingDoc.issueDate,
      expiryDate: args.expiryDate || existingDoc.expiryDate,
      isActive: existingDoc.isActive ?? true,
      version: newVersion,
      isLatest: true,
      versionNotes: args.versionNotes,
      originalDocumentId: originalDocumentId,
      createdAt: now,
      updatedAt: now,
    });

    return newDocId;
  },
});

/**
 * Query to get version history of a standalone document
 * Returns all versions sorted by version descending
 */
export const getVersionHistory = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, { documentId }) => {
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Determine the original document ID
    const originalDocumentId = document.originalDocumentId || document._id;

    // Get all versions via the index
    const versions = await ctx.db
      .query("documents")
      .withIndex("by_originalDocument", (q) => q.eq("originalDocumentId", originalDocumentId))
      .collect();

    // Include the original document if it's not in the versions list
    const originalDoc = await ctx.db.get(originalDocumentId);
    if (originalDoc && !versions.some((v) => v._id === originalDocumentId)) {
      versions.push(originalDoc);
    }

    // Enrich with related data
    const enrichedVersions = await Promise.all(
      versions.map(async (doc) => {
        const documentType = doc.documentTypeId
          ? await ctx.db.get(doc.documentTypeId)
          : null;
        const person = doc.personId ? await ctx.db.get(doc.personId) : null;
        const company = doc.companyId ? await ctx.db.get(doc.companyId) : null;

        let fileUrl = doc.fileUrl;
        if (doc.storageId) {
          fileUrl = (await ctx.storage.getUrl(doc.storageId)) ?? undefined;
        }

        return {
          ...doc,
          documentType: documentType
            ? { _id: documentType._id, name: documentType.name }
            : null,
          person: person ? { _id: person._id, fullName: getFullName(person) } : null,
          company: company ? { _id: company._id, name: company.name } : null,
          fileUrl,
        };
      })
    );

    // Sort by version descending (treat undefined as 1)
    return enrichedVersions.sort((a, b) => (b.version || 1) - (a.version || 1));
  },
});

/**
 * Mutation to restore a previous version of a standalone document (admin only)
 * Creates a NEW version reusing the storageId from the old version
 */
export const restoreVersion = mutation({
  args: {
    documentId: v.id("documents"),
    versionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const oldDocument = await ctx.db.get(args.documentId);
    if (!oldDocument) {
      throw new Error("Document not found");
    }

    // Cannot restore the current (latest) version
    if (oldDocument.isLatest === true) {
      throw new Error("Cannot restore the current version");
    }

    const now = Date.now();
    const originalDocumentId = oldDocument.originalDocumentId || oldDocument._id;

    // Find all versions
    const allVersions = await ctx.db
      .query("documents")
      .withIndex("by_originalDocument", (q) => q.eq("originalDocumentId", originalDocumentId))
      .collect();

    const originalDoc = await ctx.db.get(originalDocumentId);
    const allDocs = [...allVersions];
    if (originalDoc && !allDocs.some((d) => d._id === originalDocumentId)) {
      allDocs.push(originalDoc);
    }

    // Mark current latest as not latest
    const currentLatest = allDocs.find((doc) => doc.isLatest === true);
    if (currentLatest) {
      await ctx.db.patch(currentLatest._id, { isLatest: false });
    }

    const maxVersion = Math.max(...allDocs.map((d) => d.version || 1));
    const newVersion = maxVersion + 1;
    const notes = args.versionNotes || `Restaurado da versão ${oldDocument.version || 1}`;

    // Get file URL
    let fileUrl = oldDocument.fileUrl;
    if (oldDocument.storageId) {
      fileUrl = (await ctx.storage.getUrl(oldDocument.storageId)) ?? undefined;
    }

    // Create new version reusing old storageId
    const newDocId = await ctx.db.insert("documents", {
      name: oldDocument.name,
      documentTypeId: oldDocument.documentTypeId,
      personId: oldDocument.personId,
      companyId: oldDocument.companyId,
      individualProcessId: oldDocument.individualProcessId,
      userApplicantId: oldDocument.userApplicantId,
      storageId: oldDocument.storageId,
      fileUrl,
      fileName: oldDocument.fileName,
      fileSize: oldDocument.fileSize,
      fileType: oldDocument.fileType,
      notes: oldDocument.notes,
      issueDate: oldDocument.issueDate,
      expiryDate: oldDocument.expiryDate,
      isActive: oldDocument.isActive ?? true,
      version: newVersion,
      isLatest: true,
      versionNotes: notes,
      originalDocumentId: originalDocumentId,
      createdAt: now,
      updatedAt: now,
    });

    return newDocId;
  },
});
