import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // User profiles with role-based access control
  userProfiles: defineTable({
    userId: v.optional(v.id("users")),
    email: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("admin"), v.literal("client")),
    companyId: v.optional(v.id("companies")),
    phoneNumber: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_company", ["companyId"])
    .index("by_active", ["isActive"]),

  // Geographic lookup tables
  countries: defineTable({
    name: v.string(),
    code: v.string(),
    iso3: v.string(),
    flag: v.optional(v.string()),
  }).index("by_code", ["code"]),

  states: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    countryId: v.optional(v.id("countries")),
  })
    .index("by_country", ["countryId"])
    .index("by_code", ["code"]),

  cities: defineTable({
    name: v.string(),
    stateId: v.optional(v.id("states")),
    countryId: v.optional(v.id("countries")),
    hasFederalPolice: v.optional(v.boolean()),
  })
    .index("by_state", ["stateId"])
    .index("by_country", ["countryId"]),

  // Process configuration lookup tables
  processTypes: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    estimatedDays: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  })
    .index("by_active", ["isActive"]),

  // Legal Frameworks - Linked to Process Types
  // BREAKING CHANGE: Removed 'code' field, added 'processTypeId' foreign key
  // Migration: Existing records will need processTypeId assigned manually
  legalFrameworks: defineTable({
    name: v.string(),
    processTypeId: v.optional(v.id("processTypes")),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  })
    .index("by_processType", ["processTypeId"])
    .index("by_active", ["isActive"]),

  // Client and people management tables
  people: defineTable({
    fullName: v.string(),
    email: v.optional(v.string()),
    cpf: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    birthCityId: v.optional(v.id("cities")),
    nationalityId: v.optional(v.id("countries")),
    maritalStatus: v.optional(v.string()),
    profession: v.optional(v.string()),
    motherName: v.optional(v.string()),
    fatherName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    currentCityId: v.optional(v.id("cities")),
    photoUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_cpf", ["cpf"])
    .index("by_nationality", ["nationalityId"])
    .index("by_currentCity", ["currentCityId"]),

  companies: defineTable({
    name: v.string(),
    taxId: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    cityId: v.optional(v.id("cities")),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    contactPersonId: v.optional(v.id("people")),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_city", ["cityId"])
    .index("by_taxId", ["taxId"])
    .index("by_active", ["isActive"]),

  passports: defineTable({
    personId: v.optional(v.id("people")),
    passportNumber: v.string(),
    issuingCountryId: v.optional(v.id("countries")),
    issueDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    fileUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_person", ["personId"])
    .index("by_passportNumber", ["passportNumber"])
    .index("by_expiryDate", ["expiryDate"])
    .index("by_active", ["isActive"]),

  peopleCompanies: defineTable({
    personId: v.optional(v.id("people")),
    companyId: v.optional(v.id("companies")),
    role: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    isCurrent: v.optional(v.boolean()),
  })
    .index("by_person", ["personId"])
    .index("by_company", ["companyId"])
    .index("by_isCurrent", ["isCurrent"])
    .index("by_person_company", ["personId", "companyId"]),

  consulates: defineTable({
    name: v.string(),
    cityId: v.optional(v.id("cities")),
    address: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
  })
    .index("by_city", ["cityId"])
    .index("by_name", ["name"]),

  cboCodes: defineTable({
    code: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
  })
    .index("by_code", ["code"])
    .index("by_title", ["title"]),

  // Case Status lookup table - replaces hardcoded status strings
  caseStatuses: defineTable({
    name: v.string(), // Portuguese name
    nameEn: v.optional(v.string()), // English translation
    code: v.string(), // Unique code (em_preparacao, em_tramite, etc.)
    description: v.optional(v.string()),
    category: v.optional(v.string()), // Group similar statuses
    color: v.optional(v.string()), // For UI badges
    sortOrder: v.number(), // Display order
    isActive: v.boolean(), // Can be used
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_sortOrder", ["sortOrder"])
    .index("by_active", ["isActive"])
    .index("by_category", ["category"]),

  documentTypes: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  })
    .index("by_code", ["code"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // Process management tables
  mainProcesses: defineTable({
    referenceNumber: v.string(),
    companyId: v.optional(v.id("companies")),
    contactPersonId: v.optional(v.id("people")),
    processTypeId: v.optional(v.id("processTypes")),
    workplaceCityId: v.optional(v.id("cities")),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.optional(v.boolean()),
    requestDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    // DEPRECATED: Status is now calculated from individual processes, will be removed after migration
    status: v.string(),
    // DEPRECATED: Completion is now tracked via individual processes, will be removed after migration
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_processType", ["processTypeId"])
    .index("by_status", ["status"])
    .index("by_referenceNumber", ["referenceNumber"]),

  individualProcesses: defineTable({
    mainProcessId: v.id("mainProcesses"),
    personId: v.id("people"),
    passportId: v.optional(v.id("passports")), // Reference to the person's passport used for this process
    status: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility during migration
    caseStatusId: v.optional(v.id("caseStatuses")), // New: Reference to case status
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    cboId: v.optional(v.id("cboCodes")),
    mreOfficeNumber: v.optional(v.string()),
    douNumber: v.optional(v.string()),
    douSection: v.optional(v.string()),
    douPage: v.optional(v.string()),
    douDate: v.optional(v.string()),
    protocolNumber: v.optional(v.string()),
    rnmNumber: v.optional(v.string()),
    rnmDeadline: v.optional(v.string()),
    appointmentDateTime: v.optional(v.string()),
    deadlineDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mainProcess", ["mainProcessId"])
    .index("by_person", ["personId"])
    .index("by_passport", ["passportId"]) // Index for passport lookups
    .index("by_status", ["status"])
    .index("by_caseStatus", ["caseStatusId"]) // New index
    .index("by_legalFramework", ["legalFrameworkId"])
    .index("by_active", ["isActive"]),

  // Status history tracking for individual processes (many-to-many)
  individualProcessStatuses: defineTable({
    individualProcessId: v.id("individualProcesses"),
    statusName: v.string(), // DEPRECATED: Kept for backward compatibility during migration
    caseStatusId: v.optional(v.id("caseStatuses")), // New: Reference to case status
    isActive: v.boolean(), // Only ONE can be true at a time per process
    notes: v.optional(v.string()),
    changedBy: v.id("users"),
    changedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_individualProcess", ["individualProcessId"])
    .index("by_individualProcess_active", ["individualProcessId", "isActive"])
    .index("by_caseStatus", ["caseStatusId"]) // New index
    .index("by_changedAt", ["changedAt"]),

  // Documents management
  documents: defineTable({
    name: v.string(),
    documentTypeId: v.optional(v.id("documentTypes")),
    personId: v.optional(v.id("people")),
    companyId: v.optional(v.id("companies")),
    storageId: v.optional(v.id("_storage")),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileType: v.optional(v.string()),
    notes: v.optional(v.string()),
    issueDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_documentType", ["documentTypeId"])
    .index("by_person", ["personId"])
    .index("by_company", ["companyId"])
    .index("by_active", ["isActive"])
    .index("by_storageId", ["storageId"]),

  // Process Request Workflow - Client users submit requests for admin approval
  processRequests: defineTable({
    companyId: v.id("companies"),
    contactPersonId: v.id("people"),
    processTypeId: v.id("processTypes"),
    workplaceCityId: v.id("cities"),
    consulateId: v.optional(v.id("consulates")),
    isUrgent: v.boolean(),
    requestDate: v.string(),
    notes: v.optional(v.string()),
    status: v.string(), // "pending", "approved", "rejected"
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    approvedMainProcessId: v.optional(v.id("mainProcesses")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["status"])
    .index("by_createdBy", ["createdBy"])
    .index("by_reviewedBy", ["reviewedBy"])
    .index("by_approvedMainProcess", ["approvedMainProcessId"]),

  // Document Template System - Admin-created templates for process types
  documentTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    processTypeId: v.id("processTypes"),
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    isActive: v.boolean(),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_processType", ["processTypeId"])
    .index("by_legalFramework", ["legalFrameworkId"])
    .index("by_active", ["isActive"]),

  // Document requirements within templates
  documentRequirements: defineTable({
    templateId: v.id("documentTemplates"),
    documentTypeId: v.id("documentTypes"),
    isRequired: v.boolean(),
    isCritical: v.boolean(),
    description: v.string(),
    exampleUrl: v.optional(v.string()),
    maxSizeMB: v.number(),
    allowedFormats: v.array(v.string()),
    sortOrder: v.number(),
    validityDays: v.optional(v.number()),
    requiresTranslation: v.boolean(),
    requiresNotarization: v.boolean(),
  })
    .index("by_template", ["templateId"])
    .index("by_documentType", ["documentTypeId"])
    .index("by_sortOrder", ["sortOrder"]),

  // Documents delivered by users for individual processes
  documentsDelivered: defineTable({
    individualProcessId: v.id("individualProcesses"),
    documentTypeId: v.id("documentTypes"),
    documentRequirementId: v.optional(v.id("documentRequirements")),
    personId: v.optional(v.id("people")),
    companyId: v.optional(v.id("companies")),
    fileName: v.string(),
    fileUrl: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    status: v.string(), // "not_started", "pending_upload", "uploaded", "under_review", "approved", "rejected", "expired"
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    version: v.number(),
    isLatest: v.boolean(),
  })
    .index("by_individualProcess", ["individualProcessId"])
    .index("by_documentType", ["documentTypeId"])
    .index("by_requirement", ["documentRequirementId"])
    .index("by_status", ["status"])
    .index("by_person", ["personId"])
    .index("by_company", ["companyId"])
    .index("by_latest", ["isLatest"]),

  // Task management - Automates workflow and deadline tracking
  tasks: defineTable({
    individualProcessId: v.optional(v.id("individualProcesses")),
    mainProcessId: v.optional(v.id("mainProcesses")),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    priority: v.string(), // "low", "medium", "high", "urgent"
    status: v.string(), // "todo", "in_progress", "completed", "cancelled"
    assignedTo: v.optional(v.id("users")),
    createdBy: v.id("users"),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_individualProcess", ["individualProcessId"])
    .index("by_mainProcess", ["mainProcessId"])
    .index("by_assignedTo", ["assignedTo"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_dueDate", ["dueDate"])
    .index("by_createdBy", ["createdBy"])
    .index("by_assignedTo_status", ["assignedTo", "status"])
    .index("by_dueDate_status", ["dueDate", "status"]),

  // Process history and audit trail
  processHistory: defineTable({
    individualProcessId: v.id("individualProcesses"),
    previousStatus: v.optional(v.string()), // Kept for backward compatibility
    newStatus: v.string(), // Kept for backward compatibility
    previousStatusId: v.optional(v.id("individualProcessStatuses")), // New: reference to status record
    newStatusId: v.optional(v.id("individualProcessStatuses")), // New: reference to status record
    changedBy: v.id("users"),
    changedAt: v.number(),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_individualProcess", ["individualProcessId"])
    .index("by_changedBy", ["changedBy"])
    .index("by_changedAt", ["changedAt"]),

  // Notifications - Keep users informed of important events
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(), // "status_change", "document_approved", "task_assigned", etc.
    title: v.string(),
    message: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_createdAt", ["createdAt"])
    .index("by_type", ["type"]),

  // Dashboard widgets - User-specific dashboard customization
  dashboardWidgets: defineTable({
    userId: v.id("users"),
    widgetType: v.string(),
    position: v.object({
      x: v.number(),
      y: v.number(),
      w: v.number(),
      h: v.number(),
    }),
    settings: v.optional(v.any()),
    isVisible: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["widgetType"]),

  // Activity logs - Comprehensive audit trail for compliance
  activityLogs: defineTable({
    userId: v.id("users"),
    action: v.string(), // "created", "updated", "deleted", "status_changed", etc.
    entityType: v.string(), // "mainProcess", "document", "task", etc.
    entityId: v.string(),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_action", ["action"])
    .index("by_createdAt", ["createdAt"])
    .index("by_entity_createdAt", ["entityType", "entityId", "createdAt"]),
});
