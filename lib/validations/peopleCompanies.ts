import { z } from "zod";

export const personCompanySchema = z.object({
  personId: z.string().min(1, "Person is required"),
  companyId: z.string().min(1, "Company is required"),
  role: z.string().min(2, "Role must be at least 2 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().or(z.literal("")),
  isCurrent: z.boolean().default(false),
}).refine(
  (data) => {
    // If isCurrent is true, endDate must be empty
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
    // If endDate is provided, it must be after startDate
    if (data.endDate && data.endDate !== "") {
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
