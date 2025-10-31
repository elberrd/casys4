import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const stateSchema = z.object({
  name: z.string().min(1, "State name is required"),
  code: z.string().min(2, "State code must be 2 letters").max(2, "State code must be 2 letters").optional().or(z.literal("")),
  countryId: z.custom<Id<"countries">>((val) => typeof val === "string" && val.length > 0, {
    message: "Country ID must be a valid string",
  }).optional().or(z.literal("")),
});

export type StateFormData = z.infer<typeof stateSchema>;
