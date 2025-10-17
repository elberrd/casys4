import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// List all documents with related data
export const list = query({
  args: {
    documentTypeId: v.optional(v.id("documentTypes")),
    personId: v.optional(v.id("people")),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
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

    // Fetch related data for each document
    const documentsWithRelations = await Promise.all(
      documents.map(async (doc) => {
        const documentType = await ctx.db.get(doc.documentTypeId);
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

    return documentsWithRelations;
  },
});

// Get a single document by ID
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) return null;

    const documentType = await ctx.db.get(document.documentTypeId);
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

// Generate upload URL for file
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Create a new document
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
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
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
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });

    return documentId;
  },
});

// Update a document
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
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
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
      fileUrl,
      updatedAt: now,
    });

    return id;
  },
});

// Delete a document
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
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

// Bulk delete documents
export const bulkRemove = mutation({
  args: { ids: v.array(v.id("documents")) },
  handler: async (ctx, args) => {
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
