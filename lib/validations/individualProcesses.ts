import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const individualProcessSchema = z.object({
  mainProcessId: z.custom<Id<"mainProcesses">>((val) => typeof val === "string", {
    message: "Main process is required",
  }),
  personId: z.custom<Id<"people">>((val) => typeof val === "string", {
    message: "Person is required",
  }),
  passportId: z
    .custom<Id<"passports">>((val) => typeof val === "string", {
      message: "Invalid passport ID",
    })
    .optional()
    .or(z.literal("")),
  caseStatusId: z.custom<Id<"caseStatuses">>((val) => typeof val === "string", {
    message: "Case status is required",
  }),
  status: z.string().optional().or(z.literal("")), // DEPRECATED: Kept for backward compatibility
  activeStatusId: z
    .custom<Id<"individualProcessStatuses">>((val) => typeof val === "string", {
      message: "Invalid status ID",
    })
    .optional()
    .or(z.literal("")),
  legalFrameworkId: z.custom<Id<"legalFrameworks">>((val) => typeof val === "string", {
    message: "Legal framework ID must be valid",
  }),
  cboId: z
    .custom<Id<"cboCodes">>((val) => typeof val === "string", {
      message: "Invalid CBO code",
    })
    .optional()
    .or(z.literal("")),
  mreOfficeNumber: z.string().optional().or(z.literal("")),
  douNumber: z.string().optional().or(z.literal("")),
  douSection: z.string().optional().or(z.literal("")),
  douPage: z.string().optional().or(z.literal("")),
  douDate: z.string().optional().or(z.literal("")),
  protocolNumber: z.string().optional().or(z.literal("")),
  rnmNumber: z.string().optional().or(z.literal("")),
  rnmDeadline: z.string().optional().or(z.literal("")),
  appointmentDateTime: z.string().optional().or(z.literal("")),
  deadlineDate: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type IndividualProcessFormData = z.infer<typeof individualProcessSchema>;
