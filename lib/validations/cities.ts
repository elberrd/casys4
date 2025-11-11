import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const citySchema = z.object({
  name: z.string().min(1, "City name is required"),
  stateId: z
    .custom<Id<"states">>((val) => typeof val === "string", {
      message: "State ID must be valid",
    })
    .optional()
    .or(z.literal("")),
  countryId: z
    .custom<Id<"countries">>((val) => typeof val === "string", {
      message: "Country ID must be valid",
    })
    .optional()
    .or(z.literal("")),
  hasFederalPolice: z.boolean().optional(),
});

export type CityFormData = z.infer<typeof citySchema>;
