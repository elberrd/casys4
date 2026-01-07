import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const individualProcessSchema = z.object({
  collectiveProcessId: z
    .custom<Id<"collectiveProcesses">>((val) => typeof val === "string", {
      message: "Invalid collective process ID",
    })
    .optional()
    .or(z.literal("")),
  dateProcess: z.string().optional().or(z.literal("")), // ISO date format YYYY-MM-DD
  personId: z.custom<Id<"people">>((val) => typeof val === "string", {
    message: "Person is required",
  }),
  passportId: z
    .custom<Id<"passports">>((val) => typeof val === "string", {
      message: "Invalid passport ID",
    })
    .optional()
    .or(z.literal("")),
  applicantId: z // DEPRECATED: Split into companyApplicantId and userApplicantId
    .custom<Id<"people">>((val) => typeof val === "string", {
      message: "Invalid applicant ID",
    })
    .optional()
    .or(z.literal("")),
  companyApplicantId: z
    .custom<Id<"companies">>((val) => typeof val === "string", {
      message: "Invalid company applicant ID",
    })
    .optional()
    .or(z.literal("")),
  userApplicantId: z
    .custom<Id<"people">>((val) => typeof val === "string", {
      message: "Invalid user applicant ID",
    })
    .optional()
    .or(z.literal("")),
  consulateId: z
    .custom<Id<"consulates">>((val) => typeof val === "string", {
      message: "Invalid consulate ID",
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
  processTypeId: z
    .custom<Id<"processTypes">>((val) => typeof val === "string", {
      message: "Invalid process type ID",
    })
    .optional()
    .or(z.literal("")),
  legalFrameworkId: z.custom<Id<"legalFrameworks">>((val) => typeof val === "string", {
    message: "Legal framework ID must be valid",
  }),
  funcao: z.string().optional().or(z.literal("")),
  cboId: z
    .custom<Id<"cboCodes">>((val) => typeof val === "string", {
      message: "Invalid CBO code",
    })
    .optional()
    .or(z.literal("")),
  qualification: z
    .enum(["medio", "tecnico", "superior", "naoPossui"])
    .optional()
    .or(z.literal("")),
  professionalExperienceSince: z
    .string()
    .optional()
    .or(z.literal("")),
  mreOfficeNumber: z.string().optional().or(z.literal("")),
  douNumber: z.string().optional().or(z.literal("")),
  douSection: z.string().optional().or(z.literal("")),
  douPage: z.string().optional().or(z.literal("")),
  douDate: z.string().optional().or(z.literal("")),
  protocolNumber: z.string().optional().or(z.literal("")),
  rnmNumber: z.string().optional().or(z.literal("")),
  rnmProtocol: z.string().optional().or(z.literal("")),
  rnmDeadline: z.string().optional().or(z.literal("")),
  appointmentDateTime: z.string().optional().or(z.literal("")),
  deadlineDate: z.string().optional().or(z.literal("")),
  deadlineUnit: z.string().optional().or(z.literal("")),
  deadlineQuantity: z.coerce.number().optional(),
  deadlineSpecificDate: z.string().optional().or(z.literal("")),
  // Salary and currency fields
  lastSalaryCurrency: z.string().optional().or(z.literal("")),
  lastSalaryAmount: z.coerce.number().positive("Salary amount must be positive").optional(),
  exchangeRateToBRL: z.coerce.number().positive("Exchange rate must be positive").optional(),
  salaryInBRL: z.coerce.number().optional(),
  monthlyAmountToReceive: z.coerce.number().positive("Monthly amount must be positive").optional(),
  isActive: z.boolean().optional(), // DEPRECATED: Use processStatus instead
  processStatus: z.enum(["Atual", "Anterior"]).optional().default("Atual"),
});

export type IndividualProcessFormData = z.infer<typeof individualProcessSchema>;
