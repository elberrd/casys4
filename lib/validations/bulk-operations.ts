/**
 * Validation schemas for bulk operations
 */

import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";
import { cleanDocumentNumber, isValidCPF } from "@/lib/utils/document-masks";

// CPF validation regex (accepts both formatted XXX.XXX.XXX-XX and unformatted XXXXXXXXXXX)
const cpfRegex = /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/;

/**
 * Schema for a single person in bulk import
 * Simplified version - only required fields for import
 */
export const bulkImportPersonSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  cpf: z
    .string()
    .regex(cpfRegex, "Invalid CPF format")
    .refine((val) => isValidCPF(val), {
      message: "Invalid CPF check digits",
    })
    .transform((val) => cleanDocumentNumber(val)),
  birthDate: z.string().min(1, "Birth date is required"),
  nationality: z.string().min(1, "Nationality is required"),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed", "Other"]).optional(),
  phone: z.string().optional(),
  currentCity: z.string().optional(),
  currentState: z.string().optional(),
  currentCountry: z.string().optional(),
});

export type BulkImportPersonData = z.infer<typeof bulkImportPersonSchema>;

/**
 * Schema for bulk people import request
 */
export const bulkImportPeopleSchema = z.object({
  people: z.array(bulkImportPersonSchema).min(1, "At least one person is required"),
  collectiveProcessId: z.custom<Id<"collectiveProcesses">>((val) => typeof val === "string", {
    message: "Collective process is required",
  }).optional(),
});

export type BulkImportPeopleInput = z.infer<typeof bulkImportPeopleSchema>;

/**
 * Schema for bulk individual process creation
 */
export const bulkCreateIndividualProcessesSchema = z.object({
  collectiveProcessId: z.custom<Id<"collectiveProcesses">>((val) => typeof val === "string", {
    message: "Collective process is required",
  }),
  personIds: z.array(
    z.custom<Id<"people">>((val) => typeof val === "string", {
      message: "Invalid person ID",
    })
  ).min(1, "At least one person must be selected"),
  legalFrameworkId: z.custom<Id<"legalFrameworks">>((val) => typeof val === "string", {
    message: "Legal framework is required",
  }),
  cboId: z
    .custom<Id<"cboCodes">>((val) => typeof val === "string", {
      message: "Invalid CBO code",
    })
    .optional(),
  caseStatusId: z.custom<Id<"caseStatuses">>((val) => typeof val === "string", {
    message: "Initial case status is required",
  }),
  status: z.string().optional(), // DEPRECATED: Kept for backward compatibility
  deadlineDate: z.string().optional(),
});

export type BulkCreateIndividualProcessesInput = z.infer<typeof bulkCreateIndividualProcessesSchema>;

/**
 * Schema for bulk status update
 */
export const bulkUpdateIndividualProcessStatusSchema = z.object({
  individualProcessIds: z.array(
    z.custom<Id<"individualProcesses">>((val) => typeof val === "string", {
      message: "Invalid individual process ID",
    })
  ).min(1, "At least one individual process must be selected"),
  newStatus: z.string().min(1, "New status is required"),
  reason: z.string().optional(),
});

export type BulkUpdateIndividualProcessStatusInput = z.infer<typeof bulkUpdateIndividualProcessStatusSchema>;

/**
 * Schema for bulk document approval
 */
export const bulkApproveDocumentsSchema = z.object({
  documentIds: z.array(
    z.custom<Id<"documentsDelivered">>((val) => typeof val === "string", {
      message: "Invalid document ID",
    })
  ).min(1, "At least one document must be selected"),
  notes: z.string().optional(),
});

export type BulkApproveDocumentsInput = z.infer<typeof bulkApproveDocumentsSchema>;

/**
 * Schema for bulk document rejection
 */
export const bulkRejectDocumentsSchema = z.object({
  documentIds: z.array(
    z.custom<Id<"documentsDelivered">>((val) => typeof val === "string", {
      message: "Invalid document ID",
    })
  ).min(1, "At least one document must be selected"),
  reason: z.string().min(1, "Rejection reason is required"),
});

export type BulkRejectDocumentsInput = z.infer<typeof bulkRejectDocumentsSchema>;

/**
 * Schema for bulk document deletion
 */
export const bulkDeleteDocumentsSchema = z.object({
  documentIds: z.array(
    z.custom<Id<"documentsDelivered">>((val) => typeof val === "string", {
      message: "Invalid document ID",
    })
  ).min(1, "At least one document must be selected"),
  confirmationText: z.string().refine((val) => val === "DELETE", {
    message: "Please type DELETE to confirm",
  }),
});

export type BulkDeleteDocumentsInput = z.infer<typeof bulkDeleteDocumentsSchema>;

/**
 * Schema for bulk task creation
 */
export const bulkCreateTasksSchema = z.object({
  individualProcessIds: z.array(
    z.custom<Id<"individualProcesses">>((val) => typeof val === "string", {
      message: "Invalid individual process ID",
    })
  ).min(1, "At least one individual process must be selected"),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assignedToId: z.custom<Id<"userProfiles">>((val) => typeof val === "string", {
    message: "Assignee is required",
  }).optional(),
});

export type BulkCreateTasksInput = z.infer<typeof bulkCreateTasksSchema>;

/**
 * Schema for bulk task reassignment
 */
export const bulkReassignTasksSchema = z.object({
  taskIds: z.array(
    z.custom<Id<"tasks">>((val) => typeof val === "string", {
      message: "Invalid task ID",
    })
  ).min(1, "At least one task must be selected"),
  newAssigneeId: z.custom<Id<"userProfiles">>((val) => typeof val === "string", {
    message: "New assignee is required",
  }),
  reason: z.string().optional(),
});

export type BulkReassignTasksInput = z.infer<typeof bulkReassignTasksSchema>;

/**
 * Schema for bulk task status update
 */
export const bulkUpdateTaskStatusSchema = z.object({
  taskIds: z.array(
    z.custom<Id<"tasks">>((val) => typeof val === "string", {
      message: "Invalid task ID",
    })
  ).min(1, "At least one task must be selected"),
  newStatus: z.enum(["todo", "in_progress", "completed", "cancelled"]),
});

export type BulkUpdateTaskStatusInput = z.infer<typeof bulkUpdateTaskStatusSchema>;

/**
 * Schema for export data request
 */
export const exportDataSchema = z.object({
  exportType: z.enum(["collectiveProcesses", "individualProcesses", "people", "documents", "tasks"]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  statusFilter: z.string().optional(),
  companyId: z.custom<Id<"companies">>((val) => typeof val === "string", {
    message: "Invalid company ID",
  }).optional(),
  includeInactive: z.boolean(),
});

export type ExportDataInput = z.infer<typeof exportDataSchema>;

/**
 * Schema for adding people to a collective process
 */
export const addPeopleToCollectiveSchema = z.object({
  collectiveProcessId: z.custom<Id<"collectiveProcesses">>((val) => typeof val === "string", {
    message: "Collective process is required",
  }),
  personIds: z.array(
    z.custom<Id<"people">>((val) => typeof val === "string", {
      message: "Invalid person ID",
    })
  ).min(1, "At least one person must be selected"),
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  consulateId: z.custom<Id<"consulates">>((val) => typeof val === "string", {
    message: "Consulate is required",
  }),
  caseStatusId: z.custom<Id<"caseStatuses">>((val) => typeof val === "string", {
    message: "Initial case status is required",
  }),
});

export type AddPeopleToCollectiveInput = z.infer<typeof addPeopleToCollectiveSchema>;

/**
 * Schema for updating collective process statuses
 */
export const updateCollectiveStatusSchema = z.object({
  collectiveProcessId: z.custom<Id<"collectiveProcesses">>((val) => typeof val === "string", {
    message: "Collective process is required",
  }),
  caseStatusId: z.custom<Id<"caseStatuses">>((val) => typeof val === "string", {
    message: "Case status is required",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  notes: z.string().optional(),
  filledFieldsData: z.record(z.string(), z.any()).optional(),
});

export type UpdateCollectiveStatusInput = z.infer<typeof updateCollectiveStatusSchema>;
