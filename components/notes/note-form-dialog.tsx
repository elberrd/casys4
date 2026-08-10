"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import {
  BellRing,
  CalendarDays,
  Loader2,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserApplicantSelector } from "@/components/individual-processes/user-applicant-selector";
import {
  NoteAttachmentsManager,
  type NoteAttachmentsManagerHandle,
} from "@/components/notes/note-attachments-manager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  createNoteFormSchema,
  type NoteFormData,
} from "@/lib/validations/notes";

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId?: Id<"notes">;
  individualProcessId?: Id<"individualProcesses">;
  collectiveProcessId?: Id<"collectiveProcesses">;
  onSuccess?: () => void;
}

const DEFAULT_VALUES: NoteFormData = {
  requestedByPersonId: "",
  communicationChannel: "",
  subject: "",
  alarmDate: "",
  content: "",
};

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
  const attachmentsRef = useRef<NoteAttachmentsManagerHandle>(null);
  const [createdNoteId, setCreatedNoteId] = useState<Id<"notes">>();
  const [hasPendingFiles, setHasPendingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const activeNoteId = noteId ?? createdNoteId;
  const isEditing = Boolean(activeNoteId);
  const existingNote = useQuery(
    api.notes.get,
    activeNoteId ? { id: activeNoteId } : "skip",
  );
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);
  const validationSchema = useMemo(
    () =>
      createNoteFormSchema({
        requestedByRequired: t("validationRequestedByRequired"),
        communicationChannelRequired: t(
          "validationCommunicationChannelRequired",
        ),
        communicationChannelTooLong: t(
          "validationCommunicationChannelTooLong",
        ),
        subjectRequired: t("validationSubjectRequired"),
        subjectTooLong: t("validationSubjectTooLong"),
        contentRequired: t("validationContentRequired"),
        alarmInvalid: t("validationAlarmInvalid"),
      }),
    [t],
  );

  const form = useForm<NoteFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const legacyCommunicationChannelLabels = useMemo<Record<string, string>>(
    () => ({
      email: t("communicationChannels.email"),
      whatsapp: t("communicationChannels.whatsapp"),
      phone: t("communicationChannels.phone"),
      in_person: t("communicationChannels.inPerson"),
      video_call: t("communicationChannels.videoCall"),
      other: t("communicationChannels.other"),
    }),
    [t],
  );

  useEffect(() => {
    if (!open) return;
    if (existingNote && activeNoteId) {
      form.reset({
        requestedByPersonId: existingNote.requestedByPersonId ?? "",
        communicationChannel: existingNote.communicationChannel
          ? (legacyCommunicationChannelLabels[
              existingNote.communicationChannel
            ] ?? existingNote.communicationChannel)
          : "",
        subject: existingNote.subject ?? "",
        alarmDate: existingNote.alarmDate ?? "",
        content: existingNote.content,
      });
    } else if (!activeNoteId) {
      form.reset(DEFAULT_VALUES);
      setCreatedNoteId(undefined);
      attachmentsRef.current?.clearPendingFiles();
    }
  }, [
    activeNoteId,
    existingNote,
    form,
    legacyCommunicationChannelLabels,
    open,
  ]);

  const closeDialog = () => {
    form.reset(DEFAULT_VALUES);
    attachmentsRef.current?.clearPendingFiles();
    setCreatedNoteId(undefined);
    setHasPendingFiles(false);
    setShowUnsavedDialog(false);
    onOpenChange(false);
  };

  const requestClose = () => {
    if (isUploading || form.formState.isSubmitting) return;
    if (form.formState.isDirty || hasPendingFiles) {
      setShowUnsavedDialog(true);
      return;
    }
    closeDialog();
  };

  const onSubmit = async (data: NoteFormData) => {
    try {
      let targetNoteId = activeNoteId;
      const wasCreating = !targetNoteId;

      if (targetNoteId) {
        await updateNote({
          id: targetNoteId,
          requestedByPersonId: data.requestedByPersonId as Id<"people">,
          communicationChannel: data.communicationChannel,
          subject: data.subject,
          content: data.content,
          alarmDate: data.alarmDate || undefined,
          clearAlarm: !data.alarmDate,
        });
      } else {
        targetNoteId = await createNote({
          requestedByPersonId: data.requestedByPersonId as Id<"people">,
          communicationChannel: data.communicationChannel,
          subject: data.subject,
          content: data.content,
          alarmDate: data.alarmDate || undefined,
          individualProcessId,
          collectiveProcessId,
        });
        setCreatedNoteId(targetNoteId);
      }

      const uploadResult = await attachmentsRef.current?.uploadPendingFiles(
        targetNoteId,
      );
      if (uploadResult && uploadResult.failed > 0) {
        toast({
          title: t("attachmentPartialFailureTitle"),
          description: t("attachmentPartialFailureDescription", {
            uploaded: uploadResult.uploaded,
            failed: uploadResult.failed,
          }),
          variant: "destructive",
        });
        return;
      }

      toast({ title: wasCreating ? t("noteAdded") : t("noteUpdated") });
      onSuccess?.();
      closeDialog();
    } catch (error) {
      toast({
        title: t("noteError"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const noteDate = existingNote?.date
    ? format(parseISO(existingNote.date), "dd/MM/yyyy")
    : format(new Date(), "dd/MM/yyyy");
  const today = format(new Date(), "yyyy-MM-dd");
  const isBusy = form.formState.isSubmitting || isUploading;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) requestClose();
        }}
      >
        <DialogContent
          className="max-h-[92vh] max-w-[96vw] overflow-hidden p-0 sm:max-w-[920px]"
          showCloseButton={!isBusy}
          onEscapeKeyDown={(event) => isBusy && event.preventDefault()}
          onPointerDownOutside={(event) => isBusy && event.preventDefault()}
        >
          <DialogHeader className="mb-0 border-b px-6 py-5 text-start">
            <div className="flex items-start justify-between gap-8 pr-8">
              <div className="min-w-0">
                <DialogTitle>
                  {isEditing ? t("editNote") : t("addNote")}
                </DialogTitle>
                <DialogDescription className="mt-1.5">
                  {isEditing
                    ? t("editNoteDescription")
                    : t("addNoteDescription")}
                </DialogDescription>
              </div>
              <div className="hidden shrink-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
                <CalendarDays className="size-4" />
                <span>{noteDate}</span>
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-5">
                <section aria-labelledby="note-context-heading" className="space-y-4">
                  <div>
                    <h2
                      id="note-context-heading"
                      className="flex items-center gap-2 text-sm font-semibold"
                    >
                      <UserRound className="size-4 text-muted-foreground" />
                      {t("requestContext")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("requestContextDescription")}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="requestedByPersonId"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t("requestedByPerson")}</FormLabel>
                          <FormControl>
                            <UserApplicantSelector
                              value={field.value}
                              onChange={(value) => field.onChange(value)}
                              disabled={isBusy}
                              isolateListScroll
                            />
                          </FormControl>
                          <FormDescription>
                            {t("requestedByPersonDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("subject")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              maxLength={200}
                              disabled={isBusy}
                              placeholder={t("subjectPlaceholder")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="communicationChannel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("communicationChannel")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              maxLength={100}
                              disabled={isBusy}
                              placeholder={t(
                                "communicationChannelPlaceholder",
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="alarmDate"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="flex items-center gap-2">
                            <BellRing className="size-4 text-muted-foreground" />
                            {t("alarm")}
                            <span className="font-normal text-muted-foreground">
                              ({tCommon("optional")})
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              min={today}
                              disabled={isBusy}
                              className="sm:max-w-64"
                              onInput={(event) =>
                                field.onChange(event.currentTarget.value)
                              }
                            />
                          </FormControl>
                          <FormDescription>{t("alarmDescription")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <section aria-labelledby="note-content-heading" className="space-y-3">
                  <h2
                    id="note-content-heading"
                    className="flex items-center gap-2 text-sm font-semibold"
                  >
                    <MessageSquareText className="size-4 text-muted-foreground" />
                    {t("noteContent")}
                  </h2>
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RichTextEditor
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t("contentPlaceholder")}
                            disabled={isBusy}
                            error={Boolean(form.formState.errors.content)}
                            className="min-h-[190px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                <section aria-label={t("attachments")}>
                  <NoteAttachmentsManager
                    ref={attachmentsRef}
                    noteId={activeNoteId}
                    disabled={isBusy}
                    onPendingChange={setHasPendingFiles}
                    onUploadingChange={setIsUploading}
                  />
                </section>
              </div>

              <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestClose}
                  disabled={isBusy}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isBusy}>
                  {isBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {isUploading
                    ? t("uploadingAttachments")
                    : isEditing
                      ? tCommon("save")
                      : tCommon("create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={closeDialog}
        onCancel={() => setShowUnsavedDialog(false)}
      />
    </>
  );
}
