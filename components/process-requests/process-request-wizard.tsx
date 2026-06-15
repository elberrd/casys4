"use client";

import * as React from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NumericFormat } from "react-number-format";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  PassportUploadStep,
  type PassportCandidateResult,
} from "./passport-upload-step";
import { ResidenceSelect, type ResidenceValue } from "./residence-select";
import { LegalFrameworkSelect } from "./legal-framework-select";

// ---------------------------------------------------------------------------
// Wizard state shape (mirrors the editable fields accepted by the backend)
// ---------------------------------------------------------------------------

interface WizardFields {
  candidatePersonId?: Id<"people">;
  candidatePassportId?: Id<"passports">;
  passportStorageId?: Id<"_storage">;
  candidateEmail?: string;
  maritalStatus?: string;
  fatherName?: string;
  motherName?: string;
  processTypeId?: Id<"processTypes">;
  legalFrameworkId?: Id<"legalFrameworks">;
  workplaceCityId?: Id<"cities">;
  consulateId?: Id<"consulates">;
  isUrgent?: boolean;
  requestDate?: string;
  notes?: string;
  lastSalaryCurrency?: string;
  lastSalaryAmount?: number;
  exchangeRateToBRL?: number;
  salaryInBRL?: number;
  monthlyAmountToReceive?: number;
  visaReceiptLocation?: "brazil" | "abroad";
  residenceCountryCode?: string;
  residenceCountryName?: string;
  residenceStateCode?: string;
  residenceCity?: string;
  residenceSince?: string;
  residenceAddressAbroad?: string;
  consularPost?: string;
  professionalExperience?: string;
  // Display-only metadata (not sent to the backend)
  candidateName?: string;
}

const STEP_KEYS = [
  "stepPassport",
  "stepCivil",
  "stepFamily",
  "stepSalary",
  "stepVisa",
  "stepContact",
  "stepExperience",
  "stepLegal",
  "stepReview",
] as const;

const MARITAL_OPTIONS = ["single", "married", "divorced", "widowed"] as const;
const CURRENCY_OPTIONS = ["USD", "EUR", "BRL", "GBP"] as const;
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  BRL: "R$",
  GBP: "£",
};

/** Strips the display-only metadata before sending to the backend. */
function toBackendFields(fields: WizardFields) {
  const { candidateName: _candidateName, ...rest } = fields;
  return rest;
}

export interface ProcessRequestWizardProps {
  /** When set, resumes an existing draft instead of creating a new one. */
  requestId?: Id<"processRequests">;
}

export function ProcessRequestWizard({
  requestId: initialRequestId,
}: ProcessRequestWizardProps) {
  const t = useTranslations("ProcessRequests");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const locale = useLocale();

  const saveDraft = useMutation(api.processRequests.saveDraft);
  const createDraft = useMutation(api.processRequests.createDraft);
  const submitRequest = useMutation(api.processRequests.submit);

  const processTypes = useQuery(api.processTypes.list, { isActive: true });

  // Hydrate an existing draft when resuming.
  const existing = useQuery(
    api.processRequests.get,
    initialRequestId ? { id: initialRequestId } : "skip",
  );

  const [requestId, setRequestId] = React.useState<
    Id<"processRequests"> | undefined
  >(initialRequestId);
  const [fields, setFields] = React.useState<WizardFields>({});
  const [stepIndex, setStepIndex] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);
  const hydratedRef = React.useRef(false);

  // ---------------------------------------------------------------------------
  // Hydration from an existing draft (runs once when the query resolves)
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (!existing || hydratedRef.current) return;
    hydratedRef.current = true;

    setRequestId(existing._id);
    setFields({
      candidatePersonId: existing.candidatePersonId ?? undefined,
      candidatePassportId: existing.candidatePassportId ?? undefined,
      passportStorageId: existing.passportStorageId ?? undefined,
      candidateEmail: existing.candidateEmail ?? undefined,
      maritalStatus: existing.maritalStatus ?? undefined,
      fatherName: existing.fatherName ?? undefined,
      motherName: existing.motherName ?? undefined,
      processTypeId: existing.processTypeId ?? undefined,
      legalFrameworkId: existing.legalFrameworkId ?? undefined,
      workplaceCityId: existing.workplaceCityId ?? undefined,
      consulateId: existing.consulateId ?? undefined,
      isUrgent: existing.isUrgent ?? undefined,
      requestDate: existing.requestDate ?? undefined,
      notes: existing.notes ?? undefined,
      lastSalaryCurrency: existing.lastSalaryCurrency ?? undefined,
      lastSalaryAmount: existing.lastSalaryAmount ?? undefined,
      exchangeRateToBRL: existing.exchangeRateToBRL ?? undefined,
      salaryInBRL: existing.salaryInBRL ?? undefined,
      monthlyAmountToReceive: existing.monthlyAmountToReceive ?? undefined,
      visaReceiptLocation: existing.visaReceiptLocation ?? undefined,
      residenceCountryCode: existing.residenceCountryCode ?? undefined,
      residenceCountryName: existing.residenceCountryName ?? undefined,
      residenceStateCode: existing.residenceStateCode ?? undefined,
      residenceCity: existing.residenceCity ?? undefined,
      residenceSince: existing.residenceSince ?? undefined,
      residenceAddressAbroad: existing.residenceAddressAbroad ?? undefined,
      consularPost: existing.consularPost ?? undefined,
      professionalExperience: existing.professionalExperience ?? undefined,
      candidateName: existing.candidatePerson?.fullName ?? undefined,
    });
  }, [existing]);

  // candidatePersonId is the gate: everything past step 1 stays locked until set.
  const passportComplete = Boolean(fields.candidatePersonId);

  const steps = STEP_KEYS.map((key, index) => ({
    id: key,
    title: t(key),
    stepNumber: index + 1,
  }));

  const isLastStep = stepIndex === steps.length - 1;
  const isFirstStep = stepIndex === 0;

  const patch = React.useCallback((next: Partial<WizardFields>) => {
    setFields((prev) => ({ ...prev, ...next }));
  }, []);

  // ---------------------------------------------------------------------------
  // Persistence helpers
  // ---------------------------------------------------------------------------

  /** Ensures a draft exists, creating one on first use. Returns its id. */
  const ensureDraft = React.useCallback(
    async (current: WizardFields): Promise<Id<"processRequests">> => {
      if (requestId) {
        await saveDraft({ id: requestId, ...toBackendFields(current) });
        return requestId;
      }
      const newId = await createDraft(toBackendFields(current));
      setRequestId(newId);
      return newId;
    },
    [createDraft, saveDraft, requestId],
  );

  const persist = React.useCallback(
    async (current: WizardFields) => {
      // Only persist once a candidate exists; before that there is nothing
      // meaningful (and the draft is created at the passport step).
      if (!current.candidatePersonId) return;
      try {
        setIsSaving(true);
        await ensureDraft(current);
      } catch (error) {
        console.error("Error saving draft:", error);
        toast.error(t("createError"));
      } finally {
        setIsSaving(false);
      }
    },
    [ensureDraft, t],
  );

  // ---------------------------------------------------------------------------
  // Step 1 completion: create/link the candidate, then create the draft.
  // ---------------------------------------------------------------------------
  const handlePassportComplete = React.useCallback(
    async (result: PassportCandidateResult) => {
      const next: WizardFields = {
        ...fields,
        candidatePersonId: result.personId,
        candidatePassportId: result.passportId,
        passportStorageId: result.storageId,
      };
      setFields(next);

      try {
        setIsSaving(true);
        const id = await ensureDraft(next);
        setRequestId(id);
      } catch (error) {
        console.error("Error creating draft:", error);
        toast.error(t("createError"));
      } finally {
        setIsSaving(false);
      }
    },
    [ensureDraft, fields, t],
  );

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const goNext = async () => {
    if (isFirstStep && !passportComplete) {
      toast.error(t("mustUploadPassport"));
      return;
    }
    await persist(fields);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goPrevious = () => {
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const goToStep = (index: number) => {
    // Step 1 is always reachable; later steps only after the passport gate.
    if (index > 0 && !passportComplete) return;
    setStepIndex(index);
  };

  const handleFinishDraft = async () => {
    await persist(fields);
    toast.success(t("saved"));
    router.push(`/${locale}/process-requests`);
  };

  const handleConfirmSubmit = async () => {
    if (!requestId) return;
    try {
      setIsSubmitting(true);
      // Persist the latest edits before submitting.
      await saveDraft({ id: requestId, ...toBackendFields(fields) });
      await submitRequest({ id: requestId });
      toast.success(t("createSuccess"));
      router.push(`/${locale}/process-requests`);
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error(t("createError"));
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const processTypeOptions = React.useMemo(
    () =>
      (processTypes ?? []).map((type) => ({
        value: type._id,
        label: type.name,
      })),
    [processTypes],
  );

  const residenceValue: ResidenceValue = {
    visaReceiptLocation: fields.visaReceiptLocation,
    residenceCountryCode: fields.residenceCountryCode,
    residenceCountryName: fields.residenceCountryName,
    residenceStateCode: fields.residenceStateCode,
    residenceCity: fields.residenceCity,
    residenceSince: fields.residenceSince,
    residenceAddressAbroad: fields.residenceAddressAbroad,
    consularPost: fields.consularPost,
  };

  const busy = isSaving || isSubmitting;
  const currentStepId = steps[stepIndex].id;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Stepper */}
      <Card className="border-0 bg-card/50 shadow-sm backdrop-blur-sm">
        <CardContent className="px-4 py-6 sm:px-6">
          <div className="flex items-center overflow-x-auto">
            {steps.map((step, index) => {
              const isActive = index === stepIndex;
              const isCompleted = index < stepIndex;
              const isLocked = index > 0 && !passportComplete;
              const isClickable = !isLocked && !isActive;
              return (
                <div key={step.id} className="flex flex-1 items-center">
                  <button
                    type="button"
                    onClick={isClickable ? () => goToStep(index) : undefined}
                    disabled={isLocked || isActive}
                    className={cn(
                      "group flex items-center gap-3 transition-all",
                      isClickable && "cursor-pointer hover:opacity-80",
                      (isLocked || isActive) && "cursor-default",
                    )}
                  >
                    <div
                      className={cn(
                        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                        isActive &&
                          "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25",
                        isCompleted &&
                          !isActive &&
                          "border-primary bg-primary text-primary-foreground",
                        !isActive &&
                          !isCompleted &&
                          "border-muted-foreground/30 bg-background text-muted-foreground",
                      )}
                    >
                      {isCompleted && !isActive ? (
                        <Check className="h-5 w-5" strokeWidth={2.5} />
                      ) : isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-semibold">
                          {step.stepNumber}
                        </span>
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={cn(
                          "whitespace-nowrap text-sm font-medium transition-colors",
                          isActive && "text-foreground",
                          isCompleted && !isActive && "text-foreground",
                          !isActive &&
                            !isCompleted &&
                            "text-muted-foreground",
                        )}
                      >
                        {step.title}
                      </p>
                    </div>
                  </button>
                  {index < steps.length - 1 && (
                    <div className="mx-3 flex-1 sm:mx-4">
                      <div
                        className={cn(
                          "h-[2px] w-full transition-colors duration-300",
                          isCompleted
                            ? "bg-primary"
                            : "bg-muted-foreground/20",
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step content */}
      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-8 border-b pb-6">
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {stepIndex + 1}
              </span>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {steps[stepIndex].title}
              </h2>
            </div>
          </div>

          <div className="min-h-[350px]">
            {currentStepId === "stepPassport" && (
              <PassportUploadStep
                value={{
                  personId: fields.candidatePersonId,
                  passportId: fields.candidatePassportId,
                  storageId: fields.passportStorageId,
                  summary: fields.candidateName,
                }}
                onComplete={handlePassportComplete}
                disabled={isSubmitting}
              />
            )}

            {currentStepId === "stepCivil" && (
              <div className="max-w-md space-y-2">
                <Label>{t("maritalStatus")}</Label>
                <Select
                  value={fields.maritalStatus ?? ""}
                  onValueChange={(value) => patch({ maritalStatus: value })}
                  disabled={busy}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("maritalStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentStepId === "stepFamily" && (
              <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="father-name">{t("fatherName")}</Label>
                  <Input
                    id="father-name"
                    value={fields.fatherName ?? ""}
                    onChange={(e) => patch({ fatherName: e.target.value })}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mother-name">{t("motherName")}</Label>
                  <Input
                    id="mother-name"
                    value={fields.motherName ?? ""}
                    onChange={(e) => patch({ motherName: e.target.value })}
                    disabled={busy}
                  />
                </div>
              </div>
            )}

            {currentStepId === "stepSalary" && (
              <SalaryStep fields={fields} onPatch={patch} disabled={busy} />
            )}

            {currentStepId === "stepVisa" && (
              <ResidenceSelect
                value={residenceValue}
                onChange={(next) => patch(next)}
                disabled={busy}
              />
            )}

            {currentStepId === "stepContact" && (
              <div className="max-w-2xl space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="candidate-email">
                    {t("candidateEmail")} ({t("optional")})
                  </Label>
                  <Input
                    id="candidate-email"
                    type="email"
                    value={fields.candidateEmail ?? ""}
                    onChange={(e) => patch({ candidateEmail: e.target.value })}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    {t("notes")} ({t("optional")})
                  </Label>
                  <Textarea
                    id="notes"
                    value={fields.notes ?? ""}
                    onChange={(e) => patch({ notes: e.target.value })}
                    placeholder={t("notesPlaceholder")}
                    rows={4}
                    className="resize-none"
                    disabled={busy}
                  />
                </div>
              </div>
            )}

            {currentStepId === "stepExperience" && (
              <div className="max-w-2xl space-y-2">
                <Label htmlFor="professional-experience">
                  {t("professionalExperience")} ({t("optional")})
                </Label>
                <Textarea
                  id="professional-experience"
                  value={fields.professionalExperience ?? ""}
                  onChange={(e) =>
                    patch({ professionalExperience: e.target.value })
                  }
                  rows={6}
                  className="resize-none"
                  disabled={busy}
                />
              </div>
            )}

            {currentStepId === "stepLegal" && (
              <div className="max-w-2xl space-y-4">
                <div className="space-y-2">
                  <Label>{t("processType")}</Label>
                  <Combobox
                    options={processTypeOptions}
                    value={fields.processTypeId}
                    onValueChange={(value) =>
                      patch({
                        processTypeId: value as
                          | Id<"processTypes">
                          | undefined,
                        // Changing the process type invalidates the framework.
                        legalFrameworkId: undefined,
                      })
                    }
                    placeholder={t("selectProcessType")}
                    searchPlaceholder={t("searchProcessTypes")}
                    emptyText={t("noProcessTypesFound")}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("legalFramework")}</Label>
                  <LegalFrameworkSelect
                    processTypeId={fields.processTypeId}
                    value={fields.legalFrameworkId}
                    onChange={(value) => patch({ legalFrameworkId: value })}
                    disabled={busy}
                  />
                </div>
              </div>
            )}

            {currentStepId === "stepReview" && (
              <ReviewStep fields={fields} processTypeName={
                processTypes?.find((p) => p._id === fields.processTypeId)?.name
              } />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer navigation */}
      <Card className="border-0 bg-card/50 shadow-sm backdrop-blur-sm">
        <CardContent className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleFinishDraft}
              disabled={busy}
              className="text-muted-foreground hover:text-foreground"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("finishDraft")}
            </Button>

            <div className="flex gap-3">
              {!isFirstStep && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goPrevious}
                  disabled={busy}
                  className="min-w-[100px]"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {t("previous")}
                </Button>
              )}

              {isLastStep ? (
                <Button
                  type="button"
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={busy || !passportComplete}
                  className="min-w-[160px] bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {t("submitRequest")}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={busy || (isFirstStep && !passportComplete)}
                  className="min-w-[120px]"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t("next")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit confirmation */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("submitConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("submitConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmSubmit();
              }}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("submit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Salary
// ---------------------------------------------------------------------------

function SalaryStep({
  fields,
  onPatch,
  disabled,
}: {
  fields: WizardFields;
  onPatch: (next: Partial<WizardFields>) => void;
  disabled: boolean;
}) {
  const t = useTranslations("ProcessRequests");
  const getRate = useAction(api.exchangeRates.getRateToBRL);

  const [fetchingRate, setFetchingRate] = React.useState(false);
  const [autoFetched, setAutoFetched] = React.useState(false);

  const currency = fields.lastSalaryCurrency ?? "USD";
  const isBRL = currency === "BRL";
  const symbol = CURRENCY_SYMBOLS[currency] ?? "";

  // salaryInBRL = amount (when already BRL) or amount * rate (foreign currency).
  const computeBRL = (
    amount?: number,
    rate?: number,
    cur: string = currency,
  ): number | undefined => {
    if (amount === undefined) return undefined;
    if (cur === "BRL") return Number(amount.toFixed(2));
    if (rate === undefined) return undefined;
    return Number((amount * rate).toFixed(2));
  };

  const fetchRate = React.useCallback(
    async (cur: string, amount?: number) => {
      setFetchingRate(true);
      try {
        const res = await getRate({ currency: cur });
        if (res.rate != null) {
          onPatch({
            exchangeRateToBRL: res.rate,
            salaryInBRL: computeBRL(amount, res.rate, cur),
          });
          setAutoFetched(true);
        } else {
          toast.error(t("rateFetchError"));
        }
      } catch {
        toast.error(t("rateFetchError"));
      } finally {
        setFetchingRate(false);
      }
    },
    // computeBRL/onPatch/t/getRate are stable enough for this callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getRate, onPatch, t],
  );

  // On mount, auto-fetch a rate for a non-BRL currency that has none yet.
  React.useEffect(() => {
    if (!isBRL && fields.exchangeRateToBRL === undefined) {
      void fetchRate(currency, fields.lastSalaryAmount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCurrencyChange = (value: string) => {
    setAutoFetched(false);
    if (value === "BRL") {
      // BRL: no exchange rate needed; the amount IS the BRL value.
      onPatch({
        lastSalaryCurrency: "BRL",
        exchangeRateToBRL: 0,
        salaryInBRL: computeBRL(fields.lastSalaryAmount, 0, "BRL"),
      });
      return;
    }
    onPatch({ lastSalaryCurrency: value });
    void fetchRate(value, fields.lastSalaryAmount);
  };

  return (
    <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{t("currency")}</Label>
        <Select
          value={currency}
          onValueChange={handleCurrencyChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("currency")} />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {CURRENCY_SYMBOLS[option]} {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="salary-amount">{t("amount")}</Label>
        <NumericFormat
          id="salary-amount"
          customInput={Input}
          value={fields.lastSalaryAmount ?? ""}
          onValueChange={(v) =>
            onPatch({
              lastSalaryAmount: v.floatValue,
              salaryInBRL: computeBRL(v.floatValue, fields.exchangeRateToBRL),
            })
          }
          thousandSeparator="."
          decimalSeparator=","
          decimalScale={2}
          allowNegative={false}
          prefix={`${symbol} `}
          placeholder={`${symbol} 0,00`}
          disabled={disabled}
        />
      </div>

      {!isBRL && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="exchange-rate">{t("exchangeRate")}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => fetchRate(currency, fields.lastSalaryAmount)}
              disabled={disabled || fetchingRate}
            >
              <RefreshCw
                className={cn("mr-1 h-3 w-3", fetchingRate && "animate-spin")}
              />
              {t("updateRate")}
            </Button>
          </div>
          <NumericFormat
            id="exchange-rate"
            customInput={Input}
            value={fields.exchangeRateToBRL ?? ""}
            onValueChange={(v) => {
              setAutoFetched(false);
              onPatch({
                exchangeRateToBRL: v.floatValue,
                salaryInBRL: computeBRL(fields.lastSalaryAmount, v.floatValue),
              });
            }}
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={4}
            allowNegative={false}
            prefix="R$ "
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            {fetchingRate
              ? t("fetchingRate")
              : autoFetched
                ? t("rateAutoFetched")
                : t("rateHint", { currency })}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="salary-brl">{t("salaryInBRL")}</Label>
        <NumericFormat
          id="salary-brl"
          customInput={Input}
          value={fields.salaryInBRL ?? ""}
          thousandSeparator="."
          decimalSeparator=","
          decimalScale={2}
          fixedDecimalScale
          prefix="R$ "
          readOnly
          disabled
          className="bg-muted/50"
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="monthly-amount">{t("monthlyAmount")}</Label>
        <NumericFormat
          id="monthly-amount"
          customInput={Input}
          value={fields.monthlyAmountToReceive ?? ""}
          onValueChange={(v) =>
            onPatch({ monthlyAmountToReceive: v.floatValue })
          }
          thousandSeparator="."
          decimalSeparator=","
          decimalScale={2}
          allowNegative={false}
          prefix="R$ "
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 9 — Review (read-only summary)
// ---------------------------------------------------------------------------

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium sm:text-right">{value}</span>
    </div>
  );
}

function ReviewGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function ReviewStep({
  fields,
  processTypeName,
}: {
  fields: WizardFields;
  processTypeName?: string;
}) {
  const t = useTranslations("ProcessRequests");

  const maritalLabel = fields.maritalStatus
    ? t(fields.maritalStatus as (typeof MARITAL_OPTIONS)[number])
    : undefined;

  const visaLabel = fields.visaReceiptLocation
    ? t(fields.visaReceiptLocation)
    : undefined;

  const numberToString = (value?: number) =>
    value !== undefined ? String(value) : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <ReviewGroup title={t("candidate")}>
        <ReviewRow label={t("candidate")} value={fields.candidateName} />
        <ReviewRow label={t("candidateEmail")} value={fields.candidateEmail} />
      </ReviewGroup>

      <ReviewGroup title={t("maritalStatus")}>
        <ReviewRow label={t("maritalStatus")} value={maritalLabel} />
        <ReviewRow label={t("fatherName")} value={fields.fatherName} />
        <ReviewRow label={t("motherName")} value={fields.motherName} />
      </ReviewGroup>

      <ReviewGroup title={t("salary")}>
        <ReviewRow label={t("currency")} value={fields.lastSalaryCurrency} />
        <ReviewRow
          label={t("amount")}
          value={numberToString(fields.lastSalaryAmount)}
        />
        <ReviewRow
          label={t("exchangeRate")}
          value={numberToString(fields.exchangeRateToBRL)}
        />
        <ReviewRow
          label={t("salaryInBRL")}
          value={numberToString(fields.salaryInBRL)}
        />
        <ReviewRow
          label={t("monthlyAmount")}
          value={numberToString(fields.monthlyAmountToReceive)}
        />
      </ReviewGroup>

      <ReviewGroup title={t("residenceDuration")}>
        <ReviewRow label={t("whereWillReceiveVisa")} value={visaLabel} />
        <ReviewRow
          label={t("residenceCountry")}
          value={fields.residenceCountryName}
        />
        <ReviewRow label={t("residenceCity")} value={fields.residenceCity} />
        <ReviewRow label={t("consularPost")} value={fields.consularPost} />
        <ReviewRow
          label={t("residenceSince")}
          value={fields.residenceSince}
        />
        <ReviewRow
          label={t("residenceAddressAbroad")}
          value={fields.residenceAddressAbroad}
        />
      </ReviewGroup>

      <ReviewGroup title={t("professionalExperience")}>
        <ReviewRow
          label={t("professionalExperience")}
          value={fields.professionalExperience}
        />
      </ReviewGroup>

      <ReviewGroup title={t("legalFramework")}>
        <ReviewRow label={t("processType")} value={processTypeName} />
      </ReviewGroup>

      {fields.notes && (
        <ReviewGroup title={t("notes")}>
          <ReviewRow label={t("notes")} value={fields.notes} />
        </ReviewGroup>
      )}
    </div>
  );
}
