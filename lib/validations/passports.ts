import { z } from "zod";

export const passportSchema = z.object({
  personId: z.string().min(1, "Person is required"),
  passportNumber: z.string().min(3, "Passport number must be at least 3 characters"),
  issuingCountryId: z.string().min(1, "Issuing country is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  fileUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  isActive: z.boolean(),
}).refine(
  (data) => {
    const issueDate = new Date(data.issueDate);
    const expiryDate = new Date(data.expiryDate);
    return expiryDate > issueDate;
  },
  {
    message: "Expiry date must be after issue date",
    path: ["expiryDate"],
  }
).refine(
  (data) => {
    const issueDate = new Date(data.issueDate);
    const today = new Date();
    return issueDate <= today;
  },
  {
    message: "Issue date cannot be in the future",
    path: ["issueDate"],
  }
);

export type PassportFormData = z.infer<typeof passportSchema>;
