"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Edit, Save, X, Trash2, ExternalLink, Calendar, User } from "lucide-react";
import Link from "next/link";

interface Note {
  _id: Id<"notes">;
  content: string;
  date: string;
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
  candidateName?: string | null;
  processReference?: string | null;
  individualProcess?: {
    _id: Id<"individualProcesses">;
    collectiveProcessId?: Id<"collectiveProcesses">;
    personId?: Id<"people">;
    status?: string;
  } | null;
  collectiveProcess?: {
    _id: Id<"collectiveProcesses">;
    reference: string;
    processTypeId?: Id<"processTypes">;
    companyId?: Id<"companies">;
  } | null;
  createdByUser?: {
    _id: string;
    userId: Id<"users"> | undefined;
    fullName: string;
    email: string;
  } | null;
}

interface NoteViewModalProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (noteId: Id<"notes">) => void;
  currentUserId?: Id<"users">;
  isAdmin?: boolean;
}

const noteSchema = z.object({
  content: z.string().min(1, "Content is required"),
});

type NoteFormValues = z.infer<typeof noteSchema>;

export function NoteViewModal({
  note,
  open,
  onOpenChange,
  onDelete,
  currentUserId,
  isAdmin = false,
}: NoteViewModalProps) {
  const t = useTranslations("Notes");
  const tCommon = useTranslations("Common");
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateNote = useMutation(api.notes.update);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      content: "",
    },
  });

  // Check if user can edit/delete the note
  const canModify = () => {
    if (!note) return false;
    if (isAdmin) return true;
    return currentUserId && note.createdBy === currentUserId;
  };

  // Reset form when note changes
  useEffect(() => {
    if (note) {
      form.reset({
        content: note.content,
      });
      setIsEditMode(false);
      setHasUnsavedChanges(false);
    }
  }, [note, form]);

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      if (isEditMode) {
        setHasUnsavedChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, isEditMode]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(t("unsavedChanges"));
      if (!confirmed) return;
    }
    setIsEditMode(false);
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  const handleEditToggle = () => {
    if (isEditMode && hasUnsavedChanges) {
      const confirmed = window.confirm(t("unsavedChanges"));
      if (!confirmed) return;
    }
    setIsEditMode(!isEditMode);
    setHasUnsavedChanges(false);
    if (!isEditMode && note) {
      form.reset({ content: note.content });
    }
  };

  const onSubmit = async (values: NoteFormValues) => {
    if (!note) return;

    try {
      await updateNote({
        id: note._id,
        content: values.content,
      });

      toast.success(t("noteUpdated"));
      setIsEditMode(false);
      setHasUnsavedChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update note:", error);
      toast.error(t("noteError"));
    }
  };

  const handleDelete = () => {
    if (!note) return;
    if (onDelete) {
      onDelete(note._id);
      onOpenChange(false);
    }
  };

  if (!note) return null;

  const processUrl = note.individualProcess?.collectiveProcessId
    ? `/processes/${note.individualProcess.collectiveProcessId}/individual/${note.individualProcess._id}`
    : note.collectiveProcess
    ? `/processes/${note.collectiveProcess._id}`
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[900px] lg:max-w-[1100px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{t("noteDetails")}</DialogTitle>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(note.date), "dd/MM/yyyy", { locale: ptBR })}
                    {note.updatedAt !== note.createdAt && (
                      <span className="text-muted-foreground ml-2">
                        ({tCommon("updated")}: {format(new Date(note.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })})
                      </span>
                    )}
                  </span>
                </div>
                {note.createdByUser && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>
                      {t("createdBy")}: {note.createdByUser.fullName}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isEditMode ? "secondary" : "outline"}>
                {isEditMode ? t("editMode") : t("viewMode")}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Process Information Card */}
          {(note.individualProcess || note.collectiveProcess) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {t("processInformation")}
                  {processUrl && (
                    <Link href={processUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">{t("goToProcess")}</span>
                      </Button>
                    </Link>
                  )}
                </CardTitle>
                <CardDescription>
                  {note.individualProcess ? t("individualProcess") : t("collectiveProcess")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {note.candidateName && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("candidateName")}:
                    </span>
                    <span className="sm:col-span-2 text-sm font-semibold">
                      {note.candidateName}
                    </span>
                  </div>
                )}
                {note.processReference && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("processReference")}:
                    </span>
                    <span className="sm:col-span-2 text-sm font-mono">
                      {note.processReference}
                    </span>
                  </div>
                )}
                {note.individualProcess?.status && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {tCommon("status")}:
                    </span>
                    <div className="sm:col-span-2">
                      <Badge variant="outline">{note.individualProcess.status}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Note Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("noteContent")}</h3>
              {canModify() && !isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {tCommon("edit")}
                </Button>
              )}
            </div>

            {isEditMode ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleEditToggle}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      {tCommon("cancel")}
                    </Button>
                    <Button type="submit" className="gap-2">
                      <Save className="h-4 w-4" />
                      {tCommon("save")}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div
                className="prose prose-sm max-w-none dark:prose-invert min-h-[200px] rounded-md border p-4"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            )}
          </div>

          {/* Actions */}
          {canModify() && !isEditMode && onDelete && (
            <>
              <Separator />
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("deleteNote")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
