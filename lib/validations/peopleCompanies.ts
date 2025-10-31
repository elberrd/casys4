import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const personCompanySchema = z.object({
  personId: z.custom<Id<"people">>((val) => typeof val === "string" && val.length > 0, {
    message: "Person ID must be valid",
  }).optional().or(z.literal("")),
  companyId: z.custom<Id<"companies">>((val) => typeof val === "string" && val.length > 0, {
    message: "Company ID must be valid",
  }).optional().or(z.literal("")),
  role: z.string().min(2, "Role must be at least 2 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().or(z.literal("")),
  isCurrent: z.boolean().optional(),
}).refine(
  (data) => {
    // Only validate if isCurrent is provided and true
    if (data.isCurrent && data.endDate && data.endDate !== "") {
      return false;
    }
    return true;
  },
  {
    message: "Current employment cannot have an end date",
    path: ["endDate"],
  }
).refine(
  (data) => {
    // Only validate if both dates are provided
    if (data.endDate && data.endDate !== "" && data.startDate && data.startDate !== "") {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      return endDate > startDate;
    }
    return true;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

export type PersonCompanyFormData = z.infer<typeof personCompanySchema>;
