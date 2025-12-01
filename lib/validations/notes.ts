import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Schema for creating a new note
 */
export const createNoteSchema = z
  .object({
    content: z.string().min(1, "Content is required"),
    individualProcessId: z.custom<Id<"individualProcesses">>().optional(),
    collectiveProcessId: z.custom<Id<"collectiveProcesses">>().optional(),
  })
  .refine(
    (data) => {
      // Exactly one of individualProcessId or collectiveProcessId must be provided
      const hasIndividual = data.individualProcessId !== undefined;
      const hasCollective = data.collectiveProcessId !== undefined;
      return (hasIndividual && !hasCollective) || (!hasIndividual && hasCollective);
    },
    {
      message: "Either individualProcessId or collectiveProcessId must be provided (not both)",
      path: ["individualProcessId"],
    }
  );

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

/**
 * Schema for updating an existing note
 */
export const updateNoteSchema = z.object({
  id: z.custom<Id<"notes">>(),
  content: z.string().min(1, "Content is required").optional(),
});

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

/**
 * Schema for the note form (used in the UI)
 * Does not include process IDs as they are passed separately
 */
export const noteFormSchema = z.object({
  content: z.string().min(1, "Content is required"),
});

export type NoteFormData = z.infer<typeof noteFormSchema>;
