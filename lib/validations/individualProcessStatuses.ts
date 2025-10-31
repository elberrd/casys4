import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Validation schema for creating a new status record
 */
export const createStatusSchema = z.object({
  individualProcessId: z.custom<Id<"individualProcesses">>((val) => {
    return typeof val === "string" && val.length > 0;
  }, "Invalid individual process ID"),
  statusName: z
    .string()
    .min(1, "Status name is required")
    .max(200, "Status name must be less than 200 characters"),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
  isActive: z.boolean().default(true),
});

/**
 * Validation schema for updating an existing status record
 */
export const updateStatusSchema = z.object({
  statusId: z.custom<Id<"individualProcessStatuses">>((val) => {
    return typeof val === "string" && val.length > 0;
  }, "Invalid status ID"),
  statusName: z
    .string()
    .min(1, "Status name is required")
    .max(200, "Status name must be less than 200 characters")
    .optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * Validation schema for deleting a status record
 */
export const deleteStatusSchema = z.object({
  statusId: z.custom<Id<"individualProcessStatuses">>((val) => {
    return typeof val === "string" && val.length > 0;
  }, "Invalid status ID"),
});

// Type exports for use in components
export type CreateStatusInput = z.infer<typeof createStatusSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type DeleteStatusInput = z.infer<typeof deleteStatusSchema>;
