import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const individualProcessSchema = z.object({
  mainProcessId: z.custom<Id<"mainProcesses">>((val) => typeof val === "string", {
    message: "Main process is required",
  }),
  personId: z.custom<Id<"people">>((val) => typeof val === "string", {
    message: "Person is required",
  }),
  status: z.string().min(1, "Status is required"),
  legalFrameworkId: z.custom<Id<"legalFrameworks">>((val) => typeof val === "string", {
    message: "Legal framework is required",
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
  isActive: z.boolean().default(true),
});

export type IndividualProcessFormData = z.infer<typeof individualProcessSchema>;
