import { z } from "zod";

/**
 * Full validation schema for economic activity forms (create/edit)
 */
export const economicActivitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

/**
 * Type for full economic activity form data
 */
export type EconomicActivityFormData = z.infer<typeof economicActivitySchema>;

/**
 * Minimal validation schema for quick-create dialog (inline creation from company forms)
 */
export const economicActivityQuickCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional().or(z.literal("")),
});

/**
 * Type for quick-create form data
 */
export type EconomicActivityQuickCreateFormData = z.infer<typeof economicActivityQuickCreateSchema>;
