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

  // Legal Frameworks - Now has many-to-many relationship with Authorization Types via junction table
  // BREAKING CHANGE: Removed processTypeId field - use processTypesLegalFrameworks junction table instead
  legalFrameworks: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  })
    .index("by_active", ["isActive"]),

  // Junction table for many-to-many relationship between Authorization Types and Legal Frameworks
  processTypesLegalFrameworks: defineTable({
    processTypeId: v.id("processTypes"),
    legalFrameworkId: v.id("legalFrameworks"),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_processType", ["processTypeId"])
    .index("by_legalFramework", ["legalFrameworkId"])
    .index("by_processType_legalFramework", ["processTypeId", "legalFrameworkId"]),

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
    cargo: v.optional(v.string()),
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

  // Companies - Has many-to-many relationship with Economic Activities via companiesEconomicActivities junction table
  companies: defineTable({
    name: v.string(),
    taxId: v.optional(v.string()),
    openingDate: v.optional(v.string()), // ISO date format YYYY-MM-DD - Company opening/establishment date
    website: v.optional(v.string()),
    address: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility, use separated address fields below
    addressStreet: v.optional(v.string()), // Logradouro (street name)
    addressNumber: v.optional(v.string()), // Número
    addressComplement: v.optional(v.string()), // Complemento (apt, suite, etc.)
    addressNeighborhood: v.optional(v.string()), // Bairro
    addressPostalCode: v.optional(v.string()), // CEP (Brazilian postal code)
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

  // Economic Activities - Support data for company business activities
  economicActivities: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_code", ["code"]),

  // Junction table for many-to-many relationship between Companies and Economic Activities
  companiesEconomicActivities: defineTable({
    companyId: v.id("companies"),
    economicActivityId: v.id("economicActivities"),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_company", ["companyId"])
    .index("by_economicActivity", ["economicActivityId"])
    .index("by_company_economicActivity", ["companyId", "economicActivityId"]),

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
    cityId: v.optional(v.id("cities")),
    address: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
  })
    .index("by_city", ["cityId"]),

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
    orderNumber: v.optional(v.number()), // Workflow sequence order (1-15, some statuses have no order)
    fillableFields: v.optional(v.array(v.string())), // Array of field names from individualProcesses that can be filled when this status is added
    isActive: v.boolean(), // Can be used
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_sortOrder", ["sortOrder"])
    .index("by_orderNumber", ["orderNumber"])
    .index("by_active", ["isActive"])
    .index("by_category", ["category"]),

  // Document Categories - Managed lookup table for document type categories
  documentCategories: defineTable({
    name: v.string(), // Display name (e.g., "Identidade")
    code: v.string(), // Unique code (e.g., "IDENTITY")
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_code", ["code"])
    .index("by_isActive", ["isActive"]),

  documentTypes: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    category: v.optional(v.string()), // Legacy: string category
    categoryId: v.optional(v.id("documentCategories")), // New: reference to documentCategories
    description: v.optional(v.string()),
    allowedFileTypes: v.optional(v.array(v.string())), // [".pdf", ".jpg", ".png", etc.]
    maxFileSizeMB: v.optional(v.number()), // Maximum file size in MB
    isActive: v.optional(v.boolean()),
  })
    .index("by_code", ["code"])
    .index("by_category", ["category"])
    .index("by_categoryId", ["categoryId"])
    .index("by_active", ["isActive"]),

  // Junction table for document types and legal frameworks (many-to-many)
  documentTypesLegalFrameworks: defineTable({
    documentTypeId: v.id("documentTypes"),
    legalFrameworkId: v.id("legalFrameworks"),
    isRequired: v.boolean(), // Whether this document is required for this legal framework
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_documentType", ["documentTypeId"])
    .index("by_legalFramework", ["legalFrameworkId"])
    .index("by_documentType_legalFramework", [
      "documentTypeId",
      "legalFrameworkId",
    ]),

  // Document Type Conditions - Global conditions that can be linked to multiple document types (e.g., "legalizado", "apostilado")
  // Conditions are now global and linked to document types via documentTypeConditionLinks junction table
  // MIGRATION NOTE: documentTypeId is kept as optional for backward compatibility during migration
  // After running the migration to create links, this field will be removed from existing documents
  documentTypeConditions: defineTable({
    documentTypeId: v.optional(v.id("documentTypes")), // DEPRECATED: kept for migration, will be removed
    name: v.string(), // e.g., "Legalizado", "Apostilado"
    code: v.optional(v.string()), // e.g., "LEGALIZADO", "APOSTILADO"
    description: v.optional(v.string()),
    isRequired: v.boolean(), // Default value when linking to a document type
    relativeExpirationDays: v.optional(v.number()), // Days from individualProcess.createdAt for expiration
    isActive: v.boolean(),
    sortOrder: v.optional(v.number()), // Global sort order
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  // Junction table for many-to-many relationship between Document Types and Conditions
  documentTypeConditionLinks: defineTable({
    documentTypeId: v.id("documentTypes"),
    documentTypeConditionId: v.id("documentTypeConditions"),
    isRequired: v.boolean(), // Can override the default from documentTypeConditions
    sortOrder: v.optional(v.number()), // Order specific to this document type
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_documentType", ["documentTypeId"])
    .index("by_condition", ["documentTypeConditionId"])
    .index("by_documentType_condition", ["documentTypeId", "documentTypeConditionId"]),

  // Document Delivered Conditions - Track fulfillment of conditions for delivered documents
  documentDeliveredConditions: defineTable({
    documentsDeliveredId: v.id("documentsDelivered"),
    documentTypeConditionId: v.id("documentTypeConditions"),
    isFulfilled: v.boolean(), // Checkbox state
    fulfilledAt: v.optional(v.number()), // Timestamp when fulfilled
    fulfilledBy: v.optional(v.id("users")), // Who fulfilled it
    expiresAt: v.optional(v.number()), // Calculated on creation: individualProcess.createdAt + relativeExpirationDays
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_documentDelivered", ["documentsDeliveredId"])
    .index("by_condition", ["documentTypeConditionId"])
    .index("by_documentDelivered_condition", [
      "documentsDeliveredId",
      "documentTypeConditionId",
    ])
    .index("by_fulfilled", ["isFulfilled"]),

  // Process management tables
  collectiveProcesses: defineTable({
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
    collectiveProcessId: v.optional(v.id("collectiveProcesses")),
    dateProcess: v.optional(v.string()), // ISO date format YYYY-MM-DD - Process date
    personId: v.id("people"),
    passportId: v.optional(v.id("passports")), // Reference to the person's passport used for this process
    applicantId: v.optional(v.id("people")), // DEPRECATED: Split into companyApplicantId and userApplicantId
    companyApplicantId: v.optional(v.id("companies")), // Company applicant (optional)
    userApplicantId: v.optional(v.id("people")), // User applicant (optional, filtered by company)
    consulateId: v.optional(v.id("consulates")), // Consulate for this individual process (optional)
    status: v.optional(v.string()), // DEPRECATED: Kept for backward compatibility during migration
    caseStatusId: v.optional(v.id("caseStatuses")), // New: Reference to case status
    processTypeId: v.optional(v.id("processTypes")), // Authorization type for cascading legal framework filtering
    legalFrameworkId: v.optional(v.id("legalFrameworks")),
    funcao: v.optional(v.string()), // Função field for individual process (different from people.cargo)
    cboId: v.optional(v.id("cboCodes")),
    qualification: v.optional(v.string()), // Valid values: "medio", "tecnico", "superior", "naoPossui"
    professionalExperienceSince: v.optional(v.string()), // ISO date format YYYY-MM-DD - Professional experience start date
    mreOfficeNumber: v.optional(v.string()),
    douNumber: v.optional(v.string()),
    douSection: v.optional(v.string()),
    douPage: v.optional(v.string()),
    douDate: v.optional(v.string()),
    protocolNumber: v.optional(v.string()),
    rnmNumber: v.optional(v.string()),
    rnmProtocol: v.optional(v.string()),
    rnmDeadline: v.optional(v.string()),
    appointmentDateTime: v.optional(v.string()),
    deadlineDate: v.optional(v.string()),
    // Deadline fields for tracking process deadlines with granularity
    deadlineUnit: v.optional(v.string()), // "years", "months", or "days"
    deadlineQuantity: v.optional(v.number()), // Numeric quantity for the deadline unit
    deadlineSpecificDate: v.optional(v.string()), // ISO date format YYYY-MM-DD - Specific deadline date
    // Salary and currency information
    lastSalaryCurrency: v.optional(v.string()), // Currency code (e.g., "USD", "EUR")
    lastSalaryAmount: v.optional(v.number()), // Salary amount in selected currency
    exchangeRateToBRL: v.optional(v.number()), // Exchange rate value (BRL per unit of foreign currency)
    salaryInBRL: v.optional(v.number()), // Calculated salary in BRL
    monthlyAmountToReceive: v.optional(v.number()), // Monthly amount candidate will receive in BRL
    isActive: v.optional(v.boolean()), // DEPRECATED: Use processStatus instead
    processStatus: v.optional(v.union(v.literal("Atual"), v.literal("Anterior"))), // Process status: "Atual" (current) or "Anterior" (previous)
    urgent: v.optional(v.boolean()), // Flag to mark process as urgent
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_collectiveProcess", ["collectiveProcessId"])
    .index("by_person", ["personId"])
    .index("by_passport", ["passportId"]) // Index for passport lookups
    .index("by_applicant", ["applicantId"]) // DEPRECATED: Index for applicant lookups
    .index("by_companyApplicant", ["companyApplicantId"]) // Index for company applicant filtering
    .index("by_userApplicant", ["userApplicantId"]) // Index for user applicant filtering
    .index("by_status", ["status"])
    .index("by_caseStatus", ["caseStatusId"]) // New index
    .index("by_processType", ["processTypeId"]) // Index for authorization type filtering
    .index("by_legalFramework", ["legalFrameworkId"])
    .index("by_consulate", ["consulateId"])
    .index("by_active", ["isActive"]) // DEPRECATED: Use by_processStatus instead
    .index("by_processStatus", ["processStatus"])
    .index("by_qualification", ["qualification"])
    .index("by_urgent", ["urgent"]),

  // Status history tracking for individual processes (many-to-many)
  individualProcessStatuses: defineTable({
    individualProcessId: v.id("individualProcesses"),
    statusName: v.string(), // DEPRECATED: Kept for backward compatibility during migration
    caseStatusId: v.id("caseStatuses"), // Reference to case status (required)
    date: v.optional(v.string()), // ISO date format YYYY-MM-DD - user-editable status date
    isActive: v.boolean(), // Only ONE can be true at a time per process
    notes: v.optional(v.string()),
    fillableFields: v.optional(v.array(v.string())), // Array of field names from individualProcesses that can be filled for this status
    filledFieldsData: v.optional(v.any()), // Flexible object to store filled field data as key-value pairs
    changedBy: v.id("users"),
    changedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_individualProcess", ["individualProcessId"])
    .index("by_individualProcess_active", ["individualProcessId", "isActive"])
    .index("by_caseStatus", ["caseStatusId"])
    .index("by_changedAt", ["changedAt"]),

  // Documents management
  documents: defineTable({
    name: v.string(),
    documentTypeId: v.optional(v.id("documentTypes")),
    personId: v.optional(v.id("people")),
    companyId: v.optional(v.id("companies")),
    individualProcessId: v.optional(v.id("individualProcesses")),
    userApplicantId: v.optional(v.id("people")), // Requerente
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
    .index("by_individualProcess", ["individualProcessId"])
    .index("by_userApplicant", ["userApplicantId"])
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
    approvedCollectiveProcessId: v.optional(v.id("collectiveProcesses")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["status"])
    .index("by_createdBy", ["createdBy"])
    .index("by_reviewedBy", ["reviewedBy"])
    .index("by_approvedCollectiveProcess", ["approvedCollectiveProcessId"]),

  // Document Template System - Admin-created templates for authorization types
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
  // Supports: loose (no type), typed (with type), and pre-populated (auto-generated from legal framework)
  documentsDelivered: defineTable({
    individualProcessId: v.id("individualProcesses"),
    documentTypeId: v.optional(v.id("documentTypes")), // Optional for loose documents
    documentRequirementId: v.optional(v.id("documentRequirements")),
    documentTypeLegalFrameworkId: v.optional(
      v.id("documentTypesLegalFrameworks")
    ), // Link to document-legal framework association
    isRequired: v.optional(v.boolean()), // Whether this document is required (from auto-population)
    storageId: v.optional(v.id("_storage")), // Reference to Convex file storage
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
    .index("by_latest", ["isLatest"])
    .index("by_isRequired", ["isRequired"]),

  // Document status history - Tracks all status changes for documents
  documentStatusHistory: defineTable({
    documentId: v.id("documentsDelivered"),
    previousStatus: v.optional(v.string()), // Status before the change (null for initial upload)
    newStatus: v.string(), // Status after the change
    changedBy: v.id("users"), // User who made the change
    changedAt: v.number(), // Timestamp of the change
    notes: v.optional(v.string()), // Optional notes (e.g., rejection reason)
    metadata: v.optional(v.any()), // Additional metadata (e.g., file info for uploads)
  })
    .index("by_document", ["documentId"])
    .index("by_changedBy", ["changedBy"])
    .index("by_changedAt", ["changedAt"])
    .index("by_document_changedAt", ["documentId", "changedAt"]),

  // Task management - Automates workflow and deadline tracking
  tasks: defineTable({
    individualProcessId: v.optional(v.id("individualProcesses")),
    collectiveProcessId: v.optional(v.id("collectiveProcesses")),
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
    .index("by_collectiveProcess", ["collectiveProcessId"])
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
    entityType: v.string(), // "collectiveProcess", "individualProcess", "document", "task", etc.
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

  // Notes - Rich text notes attached to individual or collective processes
  // A process can have many notes, but each note belongs to exactly one process
  notes: defineTable({
    content: v.string(), // Rich text content (stored as HTML)
    date: v.string(), // ISO date format YYYY-MM-DD (auto-populated with current date)
    individualProcessId: v.optional(v.id("individualProcesses")), // Link to individual process
    collectiveProcessId: v.optional(v.id("collectiveProcesses")), // Link to collective process
    createdBy: v.id("users"), // User who created the note
    isActive: v.boolean(), // Soft delete flag
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_individualProcess", ["individualProcessId"])
    .index("by_collectiveProcess", ["collectiveProcessId"])
    .index("by_createdBy", ["createdBy"])
    .index("by_date", ["date"])
    .index("by_active", ["isActive"])
    .index("by_individualProcess_date", ["individualProcessId", "date"])
    .index("by_collectiveProcess_date", ["collectiveProcessId", "date"])
    .index("by_individualProcess_active", ["individualProcessId", "isActive"])
    .index("by_collectiveProcess_active", ["collectiveProcessId", "isActive"]),

  // Saved filter presets for users
  savedFilters: defineTable({
    name: v.string(), // User-defined filter name
    filterType: v.union(
      v.literal("individualProcesses"),
      v.literal("collectiveProcesses")
    ), // Which page this filter is for
    filterCriteria: v.any(), // Flexible JSON object storing filter state
    createdBy: v.id("users"), // User who created this filter
    isActive: v.boolean(), // Soft delete flag
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdBy", ["createdBy"])
    .index("by_createdBy_type", ["createdBy", "filterType"])
    .index("by_active", ["isActive"]),
});
