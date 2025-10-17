import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

// CPF validation regex (XXX.XXX.XXX-XX or XXXXXXXXXXX format)
const cpfRegex = /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/;

export const personSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  cpf: z
    .string()
    .regex(cpfRegex, "Invalid CPF format (use XXX.XXX.XXX-XX or XXXXXXXXXXX)")
    .optional()
    .or(z.literal("")),
  birthDate: z.string().min(1, "Birth date is required"),
  birthCityId: z.custom<Id<"cities">>((val) => typeof val === "string", {
    message: "Birth city is required",
  }),
  nationalityId: z.custom<Id<"countries">>((val) => typeof val === "string", {
    message: "Nationality is required",
  }),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"], {
    errorMap: () => ({ message: "Please select a marital status" }),
  }),
  profession: z.string().min(1, "Profession is required"),
  motherName: z.string().min(1, "Mother's name is required"),
  fatherName: z.string().min(1, "Father's name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  currentCityId: z.custom<Id<"cities">>((val) => typeof val === "string", {
    message: "Current city is required",
  }),
  photoUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type PersonFormData = z.infer<typeof personSchema>;

// Marital status options for form selects
export const maritalStatusOptions = [
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Divorced", label: "Divorced" },
  { value: "Widowed", label: "Widowed" },
] as const;
