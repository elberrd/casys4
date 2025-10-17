import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

export const citySchema = z.object({
  name: z.string().min(1, "City name is required"),
  stateId: z.custom<Id<"states">>((val) => typeof val === "string", {
    message: "State is required",
  }),
  hasFederalPolice: z.boolean(),
});

export type CityFormData = z.infer<typeof citySchema>;
