import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";
import { FILLABLE_FIELDS } from "@/lib/individual-process-fields";

// Category enum for case statuses
export const caseStatusCategories = [
  "preparation",
  "in_progress",
  "review",
  "approved",
  "completed",
  "cancelled",
] as const;

export type CaseStatusCategory = (typeof caseStatusCategories)[number];

export const caseStatusSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  nameEn: z
    .string()
    .min(1, "English name is required")
    .max(100, "English name must be less than 100 characters")
    .optional(),
  code: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code must be less than 50 characters")
    .regex(/^[a-z0-9_]+$/, "Code must be lowercase letters, numbers, and underscores only")
    .transform((val) => val.toLowerCase().trim()),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  category: z
    .enum(caseStatusCategories)
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .regex(
      /^#([0-9A-F]{3}|[0-9A-F]{6})$/i,
      "Color must be a valid hex color (e.g., #3B82F6)"
    )
    .optional()
    .or(z.literal("")),
  sortOrder: z
    .number()
    .int("Sort order must be an integer")
    .min(1, "Sort order must be at least 1")
    .max(9999, "Sort order must be less than 10000"),
  orderNumber: z
    .number()
    .int("Order number must be an integer")
    .min(1, "Order number must be at least 1")
    .max(99, "Order number must be less than 100")
    .optional()
    .or(z.literal("")),
  fillableFields: z
    .array(z.string())
    .refine(
      (fieldNames) => {
        const validFieldNames = FILLABLE_FIELDS.map((f) => f.fieldName);
        return fieldNames.every((name) => validFieldNames.includes(name));
      },
      { message: "Invalid field name in fillableFields array" }
    )
    .optional(),
});

export type CaseStatusFormData = z.infer<typeof caseStatusSchema>;

// Schema for updating (all fields optional except id)
export const caseStatusUpdateSchema = caseStatusSchema.partial().extend({
  id: z.custom<Id<"caseStatuses">>((val) => typeof val === "string", {
    message: "Case status ID must be valid",
  }),
});

export type CaseStatusUpdateData = z.infer<typeof caseStatusUpdateSchema>;

// Schema for reordering
export const caseStatusReorderSchema = z.object({
  updates: z.array(
    z.object({
      id: z.custom<Id<"caseStatuses">>((val) => typeof val === "string", {
        message: "Case status ID must be valid",
      }),
      sortOrder: z.number().int().min(1),
    })
  ),
});

export type CaseStatusReorderData = z.infer<typeof caseStatusReorderSchema>;

// Helper function to get category color
export function getCategoryColor(category: CaseStatusCategory): string {
  const colorMap: Record<CaseStatusCategory, string> = {
    preparation: "#3B82F6", // blue
    in_progress: "#FBBF24", // yellow
    review: "#F97316", // orange
    approved: "#10B981", // green
    completed: "#059669", // emerald
    cancelled: "#EF4444", // red
  };
  return colorMap[category];
}

// Helper function to get category label
export function getCategoryLabel(category: CaseStatusCategory): {
  pt: string;
  en: string;
} {
  const labelMap: Record<CaseStatusCategory, { pt: string; en: string }> = {
    preparation: { pt: "Preparação", en: "Preparation" },
    in_progress: { pt: "Em Andamento", en: "In Progress" },
    review: { pt: "Em Análise", en: "Under Review" },
    approved: { pt: "Aprovado", en: "Approved" },
    completed: { pt: "Concluído", en: "Completed" },
    cancelled: { pt: "Cancelado", en: "Cancelled" },
  };
  return labelMap[category];
}
