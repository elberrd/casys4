import { z } from "zod";

// CBO code format: ####-## (e.g., 2521-05)
const cboCodeRegex = /^\d{4}-\d{2}$/;

export const cboCodeSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .regex(cboCodeRegex, "Code must follow format: ####-## (e.g., 2521-05)"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

export type CboCodeFormData = z.infer<typeof cboCodeSchema>;
