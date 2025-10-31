import { z } from "zod";

// CBO code format: ####-## (e.g., 2521-05)
const cboCodeRegex = /^\d{4}-\d{2}$/;

export const cboCodeSchema = z.object({
  code: z
    .string()
    .min(1, "Code must be at least 1 character")
    .regex(cboCodeRegex, "Code must follow format: ####-## (e.g., 2521-05)")
    .optional()
    .or(z.literal("")),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").optional().or(z.literal("")),
});

export type CboCodeFormData = z.infer<typeof cboCodeSchema>;
