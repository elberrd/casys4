import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const stateSchema = z.object({
  name: z.string().min(1, "State name is required"),
  code: z.string().min(2, "State code is required (2 letters)").max(2, "State code must be 2 letters"),
  countryId: z.custom<Id<"countries">>((val) => typeof val === "string", {
    message: "Country is required",
  }),
});

export type StateFormData = z.infer<typeof stateSchema>;
