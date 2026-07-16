"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useCountryTranslation } from "@/lib/i18n/countries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  PassportUploadStep,
  type PassportCandidateResult,
} from "@/components/process-requests/passport-upload-step";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileScan, Keyboard, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

// Simplified person schema for quick add
const quickPersonSchema = z.object({
  givenNames: z.string().min(1, "Given names are required"),
  middleName: z.string().optional().or(z.literal("")),
  surname: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").or(z.literal("")),
  nationalityId: z.string().min(1, "Nationality is required"),
  birthDate: z.string().optional().or(z.literal("")),
});

type QuickPersonFormData = z.infer<typeof quickPersonSchema>;

interface QuickPersonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (personId: Id<"people">, passportId?: Id<"passports">) => void;
}

type CreationMode = "manual" | "passport";

export function QuickPersonFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickPersonFormDialogProps) {
  const t = useTranslations("People");
  const tCommon = useTranslations("Common");
  const tIndividual = useTranslations("IndividualProcesses");
  const getCountryName = useCountryTranslation();

  const countries = useQuery(api.countries.list, {}) ?? [];
  const createPerson = useMutation(api.people.create);
  const [mode, setMode] = useState<CreationMode>("manual");
  const [passportBusy, setPassportBusy] = useState(false);
  const [createdCandidate, setCreatedCandidate] =
    useState<PassportCandidateResult | null>(null);

  const form = useForm<QuickPersonFormData>({
    resolver: zodResolver(quickPersonSchema),
    defaultValues: {
      givenNames: "",
      middleName: "",
      surname: "",
      email: "",
      nationalityId: "",
      birthDate: "",
    },
  });

  const resetDialogState = useCallback(() => {
    form.reset();
    setMode("manual");
    setPassportBusy(false);
    setCreatedCandidate(null);
  }, [form]);

  const closeDialog = useCallback(() => {
    resetDialogState();
    onOpenChange(false);
  }, [onOpenChange, resetDialogState]);

  // Unsaved changes protection for the manual mode.
  const {
    showUnsavedDialog,
    setShowUnsavedDialog,
    handleOpenChange,
    handleConfirmClose,
    handleCancelClose,
  } = useUnsavedChanges({
    formState: form.formState,
    onConfirmedClose: closeDialog,
    isSubmitting: form.formState.isSubmitting,
  });

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return;
    if (passportBusy) {
      toast.info(tIndividual("passportReadingCloseBlocked"));
      return;
    }
    if (!createdCandidate) {
      handleOpenChange(false);
      return;
    }
    closeDialog();
  };

  const onSubmit = async (data: QuickPersonFormData) => {
    try {
      const personId = await createPerson({
        givenNames: data.givenNames,
        middleName: data.middleName || undefined,
        surname: data.surname || undefined,
        email: data.email || undefined,
        nationalityId: data.nationalityId as Id<"countries">,
        birthDate: data.birthDate || undefined,
      });

      toast.success(t("createdSuccess"));
      resetDialogState();
      onSuccess(personId);
      onOpenChange(false);
    } catch {
      toast.error(t("errorCreate"));
    }
  };

  const countryOptions = countries.map((country) => {
    const translatedName = getCountryName(country.code) || country.name;
    return {
      value: country._id,
      label: country.flag
        ? `${country.flag} ${translatedName}`
        : translatedName,
    };
  });

  const handlePassportAdded = (results: PassportCandidateResult[]) => {
    const candidate = results[0];
    if (!candidate) return 0;
    setCreatedCandidate(candidate);
    toast.success(tIndividual("passportPersonSaved"));
    return 1;
  };

  const useSavedCandidate = () => {
    if (!createdCandidate) return;
    const { personId, passportId } = createdCandidate;
    resetDialogState();
    onSuccess(personId, passportId);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className={cn(
            "max-h-[90vh] overflow-y-auto transition-[max-width]",
            mode === "passport" || createdCandidate ? "max-w-3xl" : "max-w-md",
          )}
        >
          <DialogHeader>
            <DialogTitle>{tIndividual("quickAddPerson")}</DialogTitle>
            <DialogDescription className="sr-only">
              {tIndividual("quickAddPersonDescription")}
            </DialogDescription>
          </DialogHeader>

          {createdCandidate ? (
            <div className="space-y-5 py-2">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {tIndividual("passportPersonSaved")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tIndividual("passportPersonSavedHint")}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                    {tIndividual("savedPerson")}
                  </div>
                  <p className="font-medium">{createdCandidate.fullName}</p>
                  <Badge variant="secondary" className="mt-2">
                    {createdCandidate.existingPerson
                      ? tIndividual("existingPersonLinked")
                      : tIndividual("newPersonCreated")}
                  </Badge>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileScan className="h-4 w-4" />
                    {tIndividual("savedPassport")}
                  </div>
                  <p className="font-medium">
                    {createdCandidate.passportNumber}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {tIndividual("linkedToPerson")}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={useSavedCandidate}>
                  {tIndividual("usePersonInProcess")}
                </Button>
              </div>
            </div>
          ) : (
            <Tabs
              value={mode}
              onValueChange={(value) => setMode(value as CreationMode)}
              className="gap-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" disabled={passportBusy}>
                  <Keyboard className="h-4 w-4" />
                  {tIndividual("createPersonManually")}
                </TabsTrigger>
                <TabsTrigger value="passport" disabled={passportBusy}>
                  <FileScan className="h-4 w-4" />
                  {tIndividual("createPersonFromPassport")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="givenNames"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("givenNames")}</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="middleName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("middleName")}</FormLabel>
                            <FormControl>
                              <Input placeholder="" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="surname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("surname")}</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("email")}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nationalityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("nationality")}</FormLabel>
                          <FormControl>
                            <Combobox
                              options={countryOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder={t("selectNationality")}
                              searchPlaceholder={tCommon("search")}
                              emptyText={tCommon("noResults")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("birthDate")}</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDialogOpenChange(false)}
                      >
                        {tCommon("cancel")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={form.formState.isSubmitting}
                      >
                        {form.formState.isSubmitting
                          ? tCommon("loading")
                          : tCommon("save")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="passport" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {tIndividual("createPersonFromPassportHint")}
                </p>
                <PassportUploadStep
                  maxToAdd={1}
                  onAdd={handlePassportAdded}
                  onBusyChange={setPassportBusy}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
    </>
  );
}
