import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  website: z.string().url("Invalid URL format").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  cityId: z.custom<Id<"cities">>((val) => typeof val === "string", {
    message: "City is required",
  }),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  contactPersonId: z
    .custom<Id<"people">>((val) => typeof val === "string", {
      message: "Invalid contact person",
    })
    .optional()
    .or(z.literal("")),
  isActive: z.boolean(),
  notes: z.string().optional().or(z.literal("")),
});

export type CompanyFormData = z.infer<typeof companySchema>;
