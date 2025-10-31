import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const legalFrameworkSchema = z.object({
  name: z.string().min(1, "Legal framework name is required"),
  processTypeId: z.custom<Id<"processTypes">>((val) => typeof val === "string", {
    message: "Process Type ID must be valid",
  }).optional().or(z.literal("")),
  description: z.string().min(1, "Description must be at least 1 character").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export type LegalFrameworkFormData = z.infer<typeof legalFrameworkSchema>;
