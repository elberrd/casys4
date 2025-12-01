"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useTranslations } from "next-intl";
import { noteFormSchema, NoteFormData } from "@/lib/validations/notes";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

// Note: Input import kept for the date field display

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId?: Id<"notes">;
  individualProcessId?: Id<"individualProcesses">;
  collectiveProcessId?: Id<"collectiveProcesses">;
  onSuccess?: () => void;
}

export function NoteFormDialog({
  open,
  onOpenChange,
  noteId,
  individualProcessId,
  collectiveProcessId,
  onSuccess,
}: NoteFormDialogProps) {
  const t = useTranslations("Notes");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!noteId;

  // Query existing note if editing
  const existingNote = useQuery(
    api.notes.get,
    noteId ? { id: noteId } : "skip"
  );

  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      content: "",
    },
  });

  // Reset form when dialog opens or note data loads
  useEffect(() => {
    if (open) {
      if (existingNote && isEditing) {
        form.reset({
          content: existingNote.content,
        });
      } else if (!isEditing) {
        form.reset({
          content: "",
        });
      }
    }
  }, [open, existingNote, isEditing, form]);

  const onSubmit = async (data: NoteFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && noteId) {
        await updateNote({
          id: noteId,
          content: data.content,
        });
        toast({
          title: t("noteUpdated"),
        });
      } else {
        await createNote({
          content: data.content,
          individualProcessId,
          collectiveProcessId,
        });
        toast({
          title: t("noteAdded"),
        });
      }

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast({
        title: t("noteError"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  const today = format(new Date(), "dd/MM/yyyy");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[800px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editNote") : t("addNote")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("editNoteDescription") || "Update the note details below."
              : t("addNoteDescription") || "Fill in the details to create a new note."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Date field - read only, auto-filled */}
            <div className="space-y-2">
              <FormLabel>{t("noteDate")}</FormLabel>
              <Input
                value={isEditing && existingNote ? format(new Date(existingNote.date), "dd/MM/yyyy") : today}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Content field - Rich Text Editor */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("noteContent")}</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("contentPlaceholder")}
                      disabled={isSubmitting}
                      error={!!form.formState.errors.content}
                      className="min-h-[200px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? tCommon("save") : tCommon("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
