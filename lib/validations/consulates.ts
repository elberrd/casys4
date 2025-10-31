import { z } from "zod";

export const consulateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  cityId: z.string().min(1, "City ID must be valid").optional().or(z.literal("")),
  address: z.string().min(5, "Address must be at least 5 characters").optional().or(z.literal("")),
  phoneNumber: z.string().min(1, "Phone number must be valid").optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type ConsulateFormData = z.infer<typeof consulateSchema>;
