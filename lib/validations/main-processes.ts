import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const mainProcessSchema = z.object({
  referenceNumber: z
    .string()
    .min(1, "Reference number is required")
    .max(100, "Reference number must be at most 100 characters"),
  companyId: z.custom<Id<"companies">>((val) => typeof val === "string", {
    message: "Company is required",
  }),
  contactPersonId: z.custom<Id<"people">>((val) => typeof val === "string", {
    message: "Contact person is required",
  }),
  processTypeId: z.custom<Id<"processTypes">>((val) => typeof val === "string", {
    message: "Process type is required",
  }),
  workplaceCityId: z.custom<Id<"cities">>((val) => typeof val === "string", {
    message: "Workplace city is required",
  }),
  consulateId: z
    .custom<Id<"consulates">>((val) => typeof val === "string", {
      message: "Invalid consulate",
    })
    .optional()
    .or(z.literal("")),
  isUrgent: z.boolean().default(false),
  requestDate: z.string().min(1, "Request date is required"),
  notes: z.string().optional().or(z.literal("")),
});

export type MainProcessFormData = z.infer<typeof mainProcessSchema>;
