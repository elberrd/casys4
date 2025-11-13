import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const processTypeSchema = z.object({
  name: z.string().min(1, "Process type name is required"),
  description: z.string().min(1, "Description must be at least 1 character").optional().or(z.literal("")),
  estimatedDays: z
    .number()
    .int("Estimated days must be an integer")
    .positive("Estimated days must be positive")
    .optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  legalFrameworkIds: z.array(
    z.custom<Id<"legalFrameworks">>((val) => typeof val === "string", {
      message: "Invalid legal framework ID",
    })
  ).default([]),
});

export type ProcessTypeFormData = z.infer<typeof processTypeSchema>;
