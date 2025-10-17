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
});
