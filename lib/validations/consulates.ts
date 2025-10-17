import { z } from "zod";

export const consulateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  cityId: z.string().min(1, "City is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type ConsulateFormData = z.infer<typeof consulateSchema>;
