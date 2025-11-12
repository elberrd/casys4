import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Date validation schema for status dates (ISO 8601 format: YYYY-MM-DD)
 */
export const dateStringSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must be in YYYY-MM-DD format"
  )
  .refine(
    (dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    },
    { message: "Invalid date" }
  );

/**
 * Validation schema for creating a new status record
 */
export const createStatusSchema = z.object({
  individualProcessId: z.custom<Id<"individualProcesses">>((val) => {
    return typeof val === "string" && val.length > 0;
  }, "Invalid individual process ID"),
  caseStatusId: z.custom<Id<"caseStatuses">>((val) => {
    return typeof val === "string" && val.length > 0;
  }, "Invalid case status ID"),
  date: dateStringSchema.optional(),
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
  caseStatusId: z.custom<Id<"caseStatuses">>((val) => {
    return typeof val === "string" && val.length > 0;
  }, "Invalid case status ID").optional(),
  date: dateStringSchema.optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * Validation schema for adding a status to an individual process
 */
export const addStatusSchema = z.object({
  individualProcessId: z.custom<Id<"individualProcesses">>((val) => {
    return typeof val === "string" && val.length > 0;
  }, "Invalid individual process ID"),
  caseStatusId: z.custom<Id<"caseStatuses">>((val) => {
    return typeof val === "string" && val.length > 0;
  }, "Invalid case status ID"),
  date: dateStringSchema.optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
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
export type AddStatusInput = z.infer<typeof addStatusSchema>;
export type DeleteStatusInput = z.infer<typeof deleteStatusSchema>;
