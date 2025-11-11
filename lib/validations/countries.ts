import { z } from "zod";

export const countrySchema = z.object({
  name: z.string().min(1, "Country name is required"),
  flag: z.string().optional(),
});

export type CountryFormData = z.infer<typeof countrySchema>;
