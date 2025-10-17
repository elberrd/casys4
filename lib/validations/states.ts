import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const stateSchema = z.object({
  name: z.string().min(1, "State name is required"),
  countryId: z.custom<Id<"countries">>((val) => typeof val === "string", {
    message: "Country is required",
  }),
});

export type StateFormData = z.infer<typeof stateSchema>;
