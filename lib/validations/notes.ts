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
interface NoteFormValidationMessages {
  requestedByRequired: string;
  communicationChannelRequired: string;
  communicationChannelTooLong: string;
  subjectRequired: string;
  subjectTooLong: string;
  contentRequired: string;
  alarmInvalid: string;
}

export function createNoteFormSchema(messages: NoteFormValidationMessages) {
  return z.object({
    requestedByPersonId: z.string().min(1, messages.requestedByRequired),
    communicationChannel: z
      .string()
      .trim()
      .min(1, messages.communicationChannelRequired)
      .max(100, messages.communicationChannelTooLong),
    subject: z
      .string()
      .trim()
      .min(1, messages.subjectRequired)
      .max(200, messages.subjectTooLong),
    alarmDate: z
      .string()
      .refine(
        (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
        messages.alarmInvalid,
      ),
    content: z.string().refine(
      (value) =>
        value
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim().length > 0,
      messages.contentRequired,
    ),
  });
}

export const noteFormSchema = createNoteFormSchema({
  requestedByRequired: "Requested-by person is required",
  communicationChannelRequired: "Communication channel is required",
  communicationChannelTooLong:
    "Communication channel must be 100 characters or fewer",
  subjectRequired: "Subject is required",
  subjectTooLong: "Subject must be 200 characters or fewer",
  contentRequired: "Content is required",
  alarmInvalid: "Alarm date is invalid",
});

export type NoteFormData = z.infer<typeof noteFormSchema>;
