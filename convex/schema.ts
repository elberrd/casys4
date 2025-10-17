import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // Geographic lookup tables
  countries: defineTable({
    name: v.string(),
    code: v.string(),
    iso3: v.string(),
  }).index("by_code", ["code"]),

  states: defineTable({
    name: v.string(),
    code: v.string(),
    countryId: v.id("countries"),
  })
    .index("by_country", ["countryId"])
    .index("by_code", ["code"]),

  cities: defineTable({
    name: v.string(),
    stateId: v.id("states"),
    hasFederalPolice: v.boolean(),
  }).index("by_state", ["stateId"]),

  // Process configuration lookup tables
  processTypes: defineTable({
    name: v.string(),
    code: v.string(),
    description: v.string(),
    category: v.string(),
    estimatedDays: v.number(),
    isActive: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  legalFrameworks: defineTable({
    name: v.string(),
    code: v.string(),
    description: v.string(),
    isActive: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  // Client and people management tables
  people: defineTable({
    fullName: v.string(),
    email: v.string(),
    cpf: v.optional(v.string()),
    birthDate: v.string(),
    birthCityId: v.id("cities"),
    nationalityId: v.id("countries"),
    maritalStatus: v.string(),
    profession: v.string(),
    motherName: v.string(),
    fatherName: v.string(),
    phoneNumber: v.string(),
    address: v.string(),
    currentCityId: v.id("cities"),
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
    taxId: v.string(),
    website: v.optional(v.string()),
    address: v.string(),
    cityId: v.id("cities"),
    phoneNumber: v.string(),
    email: v.string(),
    contactPersonId: v.optional(v.id("people")),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_city", ["cityId"])
    .index("by_taxId", ["taxId"])
    .index("by_active", ["isActive"]),

  passports: defineTable({
    personId: v.id("people"),
    passportNumber: v.string(),
    issuingCountryId: v.id("countries"),
    issueDate: v.string(),
    expiryDate: v.string(),
    fileUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_person", ["personId"])
    .index("by_passportNumber", ["passportNumber"])
    .index("by_expiryDate", ["expiryDate"])
    .index("by_active", ["isActive"]),

  peopleCompanies: defineTable({
    personId: v.id("people"),
    companyId: v.id("companies"),
    role: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    isCurrent: v.boolean(),
  })
    .index("by_person", ["personId"])
    .index("by_company", ["companyId"])
    .index("by_isCurrent", ["isCurrent"])
    .index("by_person_company", ["personId", "companyId"]),

  consulates: defineTable({
    name: v.string(),
    cityId: v.id("cities"),
    address: v.string(),
    phoneNumber: v.string(),
    email: v.string(),
    website: v.optional(v.string()),
  })
    .index("by_city", ["cityId"])
    .index("by_name", ["name"]),

  cboCodes: defineTable({
    code: v.string(),
    title: v.string(),
    description: v.string(),
  })
    .index("by_code", ["code"])
    .index("by_title", ["title"]),

  documentTypes: defineTable({
    name: v.string(),
    code: v.string(),
    category: v.string(),
    description: v.string(),
    isActive: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // Documents management
  documents: defineTable({
    name: v.string(),
    documentTypeId: v.id("documentTypes"),
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
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_documentType", ["documentTypeId"])
    .index("by_person", ["personId"])
    .index("by_company", ["companyId"])
    .index("by_active", ["isActive"])
    .index("by_storageId", ["storageId"]),
});
