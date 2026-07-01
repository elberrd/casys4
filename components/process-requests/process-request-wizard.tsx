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
  ShieldAlert,
  Trash2,
  UserCheck,
  UserRound,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  type PassportUploadStepHandle,
} from "./passport-upload-step";
import { ResidenceSelect } from "./residence-select";
import { ExistingPersonBadge } from "./existing-person-badge";

// ---------------------------------------------------------------------------
// Per-candidate state. A multi-candidate request shares ONE legal framework
// (top-level) and holds N candidates, each persisted as its own draft row in
// the request group; the per-candidate steps edit the active candidate.
// ---------------------------------------------------------------------------

/** Person-level fields whose writes are gated by dirty-tracking (see toSaveArgs). */
type PersonFieldKey =
  | "candidateEmail"
  | "maritalStatus"
  | "fatherName"
  | "motherName";

interface CandidateFields {
  processId?: Id<"individualProcesses">; // draft row id (set once created)
  personId: Id<"people">;
  passportId?: Id<"passports">;
  name: string;
  passportNumber?: string;
  // Existing-person link metadata (drives prefill, signaling, and edit rules).
  existingPerson?: boolean;
  personOwned?: boolean;
  presence?: {
    hasEmail: boolean;
    hasMaritalStatus: boolean;
    hasFatherName: boolean;
    hasMotherName: boolean;
  };
  // Which person fields the user actually edited this session. Only touched
  // fields are sent to saveDraft, so a prefilled-but-untouched form can never
  // wipe an owned person's stored PII (blank never overwrites).
  touched?: Partial<Record<PersonFieldKey, boolean>>;
  // Person-level
  candidateEmail?: string;
  maritalStatus?: string;
  fatherName?: string;
  motherName?: string;
  // Process-level
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
}

/** Structural shape of an enriched request row (from getRequestGroup / get). */
interface EnrichedRequestRow {
  _id: Id<"individualProcesses">;
  personId: Id<"people">;
  passportId?: Id<"passports"> | null;
  requestGroupId?: string | null;
  linkedExistingPerson?: boolean | null;
  legalFrameworkId?: Id<"legalFrameworks"> | null;
  consulateId?: Id<"consulates"> | null;
  urgent?: boolean | null;
  dateProcess?: string | null;
  requestNotes?: string | null;
  lastSalaryCurrency?: string | null;
  lastSalaryAmount?: number | null;
  exchangeRateToBRL?: number | null;
  salaryInBRL?: number | null;
  monthlyAmountToReceive?: number | null;
  visaReceiptLocation?: "brazil" | "abroad" | null;
  residenceCountryCode?: string | null;
  residenceCountryName?: string | null;
  residenceStateCode?: string | null;
  residenceCity?: string | null;
  residenceSince?: string | null;
  residenceAddressAbroad?: string | null;
  consularPost?: string | null;
  professionalExperience?: string | null;
  person:
    | {
        fullName: string;
        owned?: boolean | null;
        email?: string | null;
        maritalStatus?: string | null;
        fatherName?: string | null;
        motherName?: string | null;
        hasEmail?: boolean | null;
        hasMaritalStatus?: boolean | null;
        hasFatherName?: boolean | null;
        hasMotherName?: boolean | null;
      }
    | null;
  passport: { passportNumber: string } | null;
  legalFramework: { name: string } | null;
}

const STEP_KEYS = [
  "stepLegalFramework",
  "stepPassports",
  "stepPersonalData",
  "stepReview",
] as const;

// Steps edited individually per candidate (rendered with a candidate tab bar).
// "Dados Pessoais" holds ALL per-candidate fields in one step.
const PER_CANDIDATE_STEP_KEYS = new Set<string>(["stepPersonalData"]);

// Maximum candidates per request (also the max passports selectable at once).
const MAX_CANDIDATES = 10;

const MARITAL_OPTIONS = ["single", "married", "divorced", "widowed"] as const;
const CURRENCY_OPTIONS = ["USD", "EUR", "BRL", "GBP"] as const;
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  BRL: "R$",
  GBP: "£",
};

/** Maps a candidate's editable fields into createDraft/saveDraft args. */
function toSaveArgs(
  c: CandidateFields,
  legalFrameworkId: Id<"legalFrameworks"> | undefined,
) {
  return {
    legalFrameworkId,
    passportId: c.passportId,
    consulateId: c.consulateId,
    urgent: c.isUrgent,
    dateProcess: c.requestDate,
    requestNotes: c.notes,
    lastSalaryCurrency: c.lastSalaryCurrency,
    lastSalaryAmount: c.lastSalaryAmount,
    exchangeRateToBRL: c.exchangeRateToBRL,
    salaryInBRL: c.salaryInBRL,
    monthlyAmountToReceive: c.monthlyAmountToReceive,
    visaReceiptLocation: c.visaReceiptLocation,
    residenceCountryCode: c.residenceCountryCode,
    residenceCountryName: c.residenceCountryName,
    residenceStateCode: c.residenceStateCode,
    residenceCity: c.residenceCity,
    residenceSince: c.residenceSince,
    residenceAddressAbroad: c.residenceAddressAbroad,
    consularPost: c.consularPost,
    professionalExperience: c.professionalExperience,
    // Person-level PII: send ONLY fields the user actually edited this session.
    // An untouched (incl. prefilled) field is sent as undefined → the backend
    // performs no write → a blank/untouched form never wipes stored PII.
    candidateEmail: c.touched?.candidateEmail ? c.candidateEmail : undefined,
    maritalStatus: c.touched?.maritalStatus ? c.maritalStatus : undefined,
    fatherName: c.touched?.fatherName ? c.fatherName : undefined,
    motherName: c.touched?.motherName ? c.motherName : undefined,
  };
}

/** Rebuilds a candidate from an enriched draft row when resuming. */
function rowToCandidate(row: EnrichedRequestRow): CandidateFields {
  return {
    processId: row._id,
    personId: row.personId,
    passportId: row.passportId ?? undefined,
    name: row.person?.fullName ?? "",
    passportNumber: row.passport?.passportNumber ?? undefined,
    existingPerson: row.linkedExistingPerson ?? false,
    personOwned: row.person?.owned ?? false,
    presence: {
      hasEmail: row.person?.hasEmail ?? false,
      hasMaritalStatus: row.person?.hasMaritalStatus ?? false,
      hasFatherName: row.person?.hasFatherName ?? false,
      hasMotherName: row.person?.hasMotherName ?? false,
    },
    touched: {},
    candidateEmail: row.person?.email ?? undefined,
    maritalStatus: row.person?.maritalStatus ?? undefined,
    fatherName: row.person?.fatherName ?? undefined,
    motherName: row.person?.motherName ?? undefined,
    consulateId: row.consulateId ?? undefined,
    isUrgent: row.urgent ?? undefined,
    requestDate: row.dateProcess ?? undefined,
    notes: row.requestNotes ?? undefined,
    lastSalaryCurrency: row.lastSalaryCurrency ?? undefined,
    lastSalaryAmount: row.lastSalaryAmount ?? undefined,
    exchangeRateToBRL: row.exchangeRateToBRL ?? undefined,
    salaryInBRL: row.salaryInBRL ?? undefined,
    monthlyAmountToReceive: row.monthlyAmountToReceive ?? undefined,
    visaReceiptLocation: row.visaReceiptLocation ?? undefined,
    residenceCountryCode: row.residenceCountryCode ?? undefined,
    residenceCountryName: row.residenceCountryName ?? undefined,
    residenceStateCode: row.residenceStateCode ?? undefined,
    residenceCity: row.residenceCity ?? undefined,
    residenceSince: row.residenceSince ?? undefined,
    residenceAddressAbroad: row.residenceAddressAbroad ?? undefined,
    consularPost: row.consularPost ?? undefined,
    professionalExperience: row.professionalExperience ?? undefined,
  };
}

export interface ProcessRequestWizardProps {
  /** Resume an existing multi-candidate request batch. */
  requestGroupId?: string;
  /** Legacy single-draft resume (rows created before request groups existed). */
  requestId?: Id<"individualProcesses">;
}

export function ProcessRequestWizard({
  requestGroupId: initialGroupId,
  requestId: initialRequestId,
}: ProcessRequestWizardProps) {
  const t = useTranslations("ProcessRequests");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const locale = useLocale();

  const createDraft = useMutation(api.processRequests.createDraft);
  const saveDraft = useMutation(api.processRequests.saveDraft);
  const finalizeGroup = useMutation(api.processRequests.finalizeGroup);
  const finalizeOne = useMutation(api.processRequests.finalize);
  const removeDraft = useMutation(api.processRequests.removeDraft);
  const ensureRequestGroup = useMutation(api.processRequests.ensureRequestGroup);

  // Legal frameworks offered to clients (admin-gated via showInRequest).
  const requestFrameworks = useQuery(api.legalFrameworks.listForRequest, {});

  // Hydration sources: a whole group, or a single legacy draft row.
  const groupRows = useQuery(
    api.processRequests.getRequestGroup,
    initialGroupId ? { requestGroupId: initialGroupId } : "skip",
  );
  const legacyRow = useQuery(
    api.processRequests.get,
    !initialGroupId && initialRequestId ? { id: initialRequestId } : "skip",
  );

  const [requestGroupId, setRequestGroupId] = React.useState<
    string | undefined
  >(initialGroupId);
  const [legalFrameworkId, setLegalFrameworkId] = React.useState<
    Id<"legalFrameworks"> | undefined
  >();
  const [legalFrameworkName, setLegalFrameworkName] = React.useState<
    string | undefined
  >();
  const [candidates, setCandidates] = React.useState<CandidateFields[]>([]);
  const [activeCandidateId, setActiveCandidateId] = React.useState<
    Id<"people"> | undefined
  >();
  const [stepIndex, setStepIndex] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAddingCandidate, setIsAddingCandidate] = React.useState(false);
  const [isCommittingBatch, setIsCommittingBatch] = React.useState(false);
  // Reviewed-but-not-yet-added passports living inside the uploader. Lets the
  // footer enable + auto-commit them on "Próximo" / "Salvar rascunho".
  const [pendingReady, setPendingReady] = React.useState(0);
  const uploadRef = React.useRef<PassportUploadStepHandle>(null);
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);
  const [pendingRemoval, setPendingRemoval] =
    React.useState<CandidateFields | null>(null);
  const hydratedRef = React.useRef(false);

  // ---------------------------------------------------------------------------
  // Hydration from an existing batch / legacy draft (runs once when resolved).
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    if (hydratedRef.current) return;
    const rows: EnrichedRequestRow[] | undefined = initialGroupId
      ? (groupRows as EnrichedRequestRow[] | undefined)
      : legacyRow
        ? [legacyRow as unknown as EnrichedRequestRow]
        : undefined;
    if (!rows || rows.length === 0) return;
    hydratedRef.current = true;

    const mapped = rows.map(rowToCandidate);
    setCandidates(mapped);
    setActiveCandidateId(mapped[0]?.personId);
    const first = rows[0];
    setRequestGroupId(first.requestGroupId ?? initialGroupId);
    setLegalFrameworkId(first.legalFrameworkId ?? undefined);
    setLegalFrameworkName(first.legalFramework?.name ?? undefined);
  }, [groupRows, legacyRow, initialGroupId]);

  const steps = STEP_KEYS.map((key, index) => ({
    id: key,
    title: t(key),
    stepNumber: index + 1,
  }));
  const currentStepId = steps[stepIndex].id;
  const isLastStep = stepIndex === steps.length - 1;
  const isFirstStep = stepIndex === 0;

  const frameworkComplete = Boolean(legalFrameworkId);
  const hasCandidates = candidates.length > 0;
  const busy =
    isSaving || isSubmitting || isAddingCandidate || isCommittingBatch;
  // Something is committable when there are candidates OR a reviewed batch.
  const canProceed = hasCandidates || pendingReady > 0;

  // Commit a pending review batch (if any) via the uploader's imperative handle;
  // resolves with the number of candidates added.
  const commitPendingBatch = React.useCallback(async (): Promise<number> => {
    if (pendingReady <= 0 || !uploadRef.current) return 0;
    setIsCommittingBatch(true);
    try {
      return await uploadRef.current.commitReady();
    } finally {
      setIsCommittingBatch(false);
    }
  }, [pendingReady]);

  const activeCandidate =
    candidates.find((c) => c.personId === activeCandidateId) ?? candidates[0];

  const patchCandidate = React.useCallback(
    (personId: Id<"people">, next: Partial<CandidateFields>) => {
      setCandidates((prev) =>
        prev.map((c) => (c.personId === personId ? { ...c, ...next } : c)),
      );
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------
  const persistCandidate = React.useCallback(
    async (candidate: CandidateFields) => {
      if (!candidate.processId) return;
      await saveDraft({
        id: candidate.processId,
        ...toSaveArgs(candidate, legalFrameworkId),
      });
    },
    [saveDraft, legalFrameworkId],
  );

  const persistAll = React.useCallback(async (): Promise<boolean> => {
    try {
      setIsSaving(true);
      for (const candidate of candidates) await persistCandidate(candidate);
      return true;
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error(t("createError"));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [candidates, persistCandidate, t]);

  /** Persist the candidate currently being edited (used when navigating away). */
  const persistActive = React.useCallback(async () => {
    if (!activeCandidate?.processId) return;
    try {
      setIsSaving(true);
      await persistCandidate(activeCandidate);
    } catch (error) {
      console.error("Error saving candidate:", error);
      toast.error(t("createError"));
    } finally {
      setIsSaving(false);
    }
  }, [activeCandidate, persistCandidate, t]);

  // ---------------------------------------------------------------------------
  // Legal framework (shared) — propagate a change to every candidate's draft.
  // ---------------------------------------------------------------------------
  const handleSelectFramework = React.useCallback(
    async (id: Id<"legalFrameworks">, name: string) => {
      setLegalFrameworkId(id);
      setLegalFrameworkName(name);
      const existing = candidates.filter((c) => c.processId);
      if (existing.length === 0) return;
      try {
        setIsSaving(true);
        for (const candidate of existing) {
          await saveDraft({ id: candidate.processId!, legalFrameworkId: id });
        }
      } catch (error) {
        console.error("Error updating framework:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [candidates, saveDraft],
  );

  // ---------------------------------------------------------------------------
  // Candidate add / remove
  // ---------------------------------------------------------------------------
  // Adds one OR many candidates (multi-passport selection) in a single batch,
  // sharing one request group. Dedups against existing candidates and caps the
  // total at MAX_CANDIDATES.
  const handleAddCandidates = React.useCallback(
    async (results: PassportCandidateResult[]) => {
      const capacity = MAX_CANDIDATES - candidates.length;
      if (capacity <= 0) {
        toast.error(t("maxCandidatesReached", { max: MAX_CANDIDATES }));
        return 0;
      }
      const seen = new Set(candidates.map((c) => c.personId));
      const fresh: PassportCandidateResult[] = [];
      for (const r of results) {
        if (seen.has(r.personId)) continue;
        seen.add(r.personId);
        fresh.push(r);
      }
      // Resolved candidates already present in this request (a passport that
      // links to an already-added candidate) are dropped — tell the user.
      const duplicateDropped = results.length - fresh.length;
      const toAdd = fresh.slice(0, capacity);
      if (toAdd.length === 0) {
        toast.error(t("candidateAlreadyAdded"));
        return 0;
      }

      setIsAddingCandidate(true);
      let groupId = requestGroupId;
      const newCandidates: CandidateFields[] = [];
      try {
        // Backfill: a legacy draft resumed via ?id= has no group yet — assign one
        // to the existing row first so the whole batch finalizes together.
        if (!groupId) {
          for (const existing of candidates) {
            if (existing.processId) {
              groupId = await ensureRequestGroup({ id: existing.processId });
            }
          }
        }
        // This loop MUST stay sequential: createDraft reuses the passed group id
        // only if a row already committed in it is owned by the caller, so
        // parallelizing would make each call mint a SEPARATE group.
        for (const r of toAdd) {
          const { processId, requestGroupId: gid } = await createDraft({
            personId: r.personId,
            requestGroupId: groupId,
            passportId: r.passportId,
            legalFrameworkId,
            linkedExistingPerson: r.existingPerson,
          });
          groupId = gid;
          setRequestGroupId(gid); // persist the group as soon as it's known
          newCandidates.push({
            processId,
            personId: r.personId,
            passportId: r.passportId,
            name: r.fullName,
            passportNumber: r.passportNumber,
            existingPerson: r.existingPerson,
            personOwned: r.personOwned,
            presence: r.presence,
            touched: {},
            // Prefill Dados Pessoais from the owned-gated snapshot (null when the
            // person is protected / cross-tenant → fields stay empty).
            candidateEmail: r.person.email ?? undefined,
            maritalStatus: r.person.maritalStatus ?? undefined,
            fatherName: r.person.fatherName ?? undefined,
            motherName: r.person.motherName ?? undefined,
          });
        }
      } catch (error) {
        console.error("Error adding candidates:", error);
        toast.error(t("createError"));
      } finally {
        // Commit whatever succeeded so a partial failure never orphans the rows
        // already created in the DB.
        if (newCandidates.length > 0) {
          setCandidates((prev) => [...prev, ...newCandidates]);
          setActiveCandidateId(newCandidates[0].personId);
          toast.success(
            newCandidates.length === 1
              ? t("candidateAdded")
              : t("candidatesAdded", { count: newCandidates.length }),
          );
        }
        if (fresh.length > toAdd.length) {
          toast.warning(t("maxCandidatesReached", { max: MAX_CANDIDATES }));
        }
        if (duplicateDropped > 0) {
          toast.info(t("duplicateCandidatesSkipped", { count: duplicateDropped }));
        }
        setIsAddingCandidate(false);
      }
      return newCandidates.length;
    },
    [
      candidates,
      createDraft,
      ensureRequestGroup,
      requestGroupId,
      legalFrameworkId,
      t,
    ],
  );

  const confirmRemoveCandidate = React.useCallback(async () => {
    const candidate = pendingRemoval;
    if (!candidate) return;
    try {
      setIsSaving(true);
      if (candidate.processId) await removeDraft({ id: candidate.processId });
      const next = candidates.filter((c) => c.personId !== candidate.personId);
      setCandidates(next);
      setActiveCandidateId((current) =>
        current === candidate.personId ? next[0]?.personId : current,
      );
    } catch (error) {
      console.error("Error removing candidate:", error);
      toast.error(t("createError"));
    } finally {
      setIsSaving(false);
      setPendingRemoval(null);
    }
  }, [candidates, pendingRemoval, removeDraft, t]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const isStepLocked = (index: number) =>
    (index >= 1 && !frameworkComplete) || (index >= 2 && !hasCandidates);

  const goNext = async () => {
    if (stepIndex === 0 && !frameworkComplete) {
      toast.error(t("mustSelectLegalFramework"));
      return;
    }
    if (stepIndex === 1) {
      // Auto-commit any reviewed-but-not-yet-added passports so the user isn't
      // blocked by the separate "Adicionar candidatos" click.
      const added = await commitPendingBatch();
      if (!hasCandidates && !added) {
        toast.error(t("mustAddCandidate"));
        return;
      }
    }
    if (PER_CANDIDATE_STEP_KEYS.has(currentStepId)) {
      await persistActive();
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goPrevious = async () => {
    if (PER_CANDIDATE_STEP_KEYS.has(currentStepId)) {
      await persistActive();
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const goToStep = async (index: number) => {
    if (isStepLocked(index) || index === stepIndex) return;
    if (PER_CANDIDATE_STEP_KEYS.has(currentStepId)) {
      await persistActive();
    }
    setStepIndex(index);
  };

  const handleSelectCandidate = async (personId: Id<"people">) => {
    if (personId === activeCandidateId) return;
    if (PER_CANDIDATE_STEP_KEYS.has(currentStepId)) {
      await persistActive();
    }
    setActiveCandidateId(personId);
  };

  const handleSaveDraft = async () => {
    // Commit any reviewed-but-not-yet-added passports first (createDraft persists
    // them), then save edits to already-committed candidates.
    const added = await commitPendingBatch();
    if (!hasCandidates && !added) {
      toast.error(t("mustAddCandidate"));
      return;
    }
    const ok = await persistAll();
    if (!ok) return;
    toast.success(t("saved"));
    router.push(`/${locale}/process-requests`);
  };

  const handleConfirmSubmit = async () => {
    if (!hasCandidates) return;
    try {
      setIsSubmitting(true);
      // Persist the latest edits before finalizing.
      for (const candidate of candidates) await persistCandidate(candidate);
      if (requestGroupId) {
        await finalizeGroup({ requestGroupId });
      } else {
        // Legacy single drafts without a group: finalize each row directly.
        for (const candidate of candidates) {
          if (candidate.processId) await finalizeOne({ id: candidate.processId });
        }
      }
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Stepper */}
      <Card className="border-0 bg-card/50 shadow-sm backdrop-blur-sm">
        <CardContent className="px-4 py-6 sm:px-6">
          <div className="flex items-center overflow-x-auto">
            {steps.map((step, index) => {
              const isActive = index === stepIndex;
              const isCompleted = index < stepIndex;
              const isLocked = isStepLocked(index);
              const isClickable = !isLocked && !isActive;
              return (
                <div key={step.id} className="flex flex-1 items-center">
                  <button
                    type="button"
                    onClick={isClickable ? () => goToStep(index) : undefined}
                    disabled={isLocked || isActive || busy}
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
                          !isActive && !isCompleted && "text-muted-foreground",
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

          {/* Candidate tab bar on the per-candidate steps */}
          {PER_CANDIDATE_STEP_KEYS.has(currentStepId) && hasCandidates && (
            <CandidateTabBar
              candidates={candidates}
              activeId={activeCandidate?.personId}
              onSelect={handleSelectCandidate}
              disabled={busy}
            />
          )}

          <div className="min-h-[350px]">
            {currentStepId === "stepLegalFramework" && (
              <RequestLegalFrameworkStep
                frameworks={requestFrameworks}
                value={legalFrameworkId}
                onSelect={handleSelectFramework}
                disabled={busy}
              />
            )}

            {currentStepId === "stepPassports" && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  {t("addPassportsHint")}
                </p>

                {candidates.length > 0 && (
                  <div className="space-y-2">
                    {candidates.map((candidate, index) => (
                      <div
                        key={candidate.personId}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {candidate.name || t("candidate")}
                            </p>
                            {candidate.passportNumber && (
                              <p className="truncate text-xs text-muted-foreground">
                                {t("passportNumber")}:{" "}
                                {candidate.passportNumber}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingRemoval(candidate)}
                          disabled={busy}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {candidates.length >= MAX_CANDIDATES ? (
                  <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                    {t("maxCandidatesReached", { max: MAX_CANDIDATES })}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {candidates.length > 0
                        ? t("addAnotherCandidate")
                        : t("addFirstCandidate")}
                    </p>
                    {/* Remounts after each add so the uploader resets cleanly. */}
                    <PassportUploadStep
                      key={`add-${candidates.length}`}
                      ref={uploadRef}
                      onAdd={handleAddCandidates}
                      onPendingReadyChange={setPendingReady}
                      maxToAdd={MAX_CANDIDATES - candidates.length}
                      disabled={busy}
                    />
                  </div>
                )}
              </div>
            )}

            {currentStepId === "stepPersonalData" && activeCandidate && (
              <PersonalDataStep
                key={activeCandidate.personId}
                candidate={activeCandidate}
                onPatch={(next) =>
                  patchCandidate(activeCandidate.personId, next)
                }
                disabled={busy}
              />
            )}

            {currentStepId === "stepReview" && (
              <ReviewStep
                candidates={candidates}
                legalFrameworkName={legalFrameworkName}
              />
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
              onClick={handleSaveDraft}
              disabled={busy || !canProceed}
              className="text-muted-foreground hover:text-foreground"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("saveDraft")}
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
                  disabled={busy || !hasCandidates}
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
                  disabled={
                    busy ||
                    (stepIndex === 0 && !frameworkComplete) ||
                    (stepIndex === 1 && !canProceed)
                  }
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
              {t("submitConfirmBodyBatch", { count: candidates.length })}
            </AlertDialogDescription>
            {candidates.some((c) => c.existingPerson) && (
              <p className="text-sm text-muted-foreground">
                {t("submitLinkedSummary", {
                  count: candidates.filter((c) => c.existingPerson).length,
                })}
              </p>
            )}
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

      {/* Remove-candidate confirmation */}
      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeCandidateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeCandidateBody", {
                name: pendingRemoval?.name || t("candidate"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmRemoveCandidate();
              }}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("removeCandidate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate tab bar (per-candidate steps)
// ---------------------------------------------------------------------------

function CandidateTabBar({
  candidates,
  activeId,
  onSelect,
  disabled,
}: {
  candidates: CandidateFields[];
  activeId?: Id<"people">;
  onSelect: (personId: Id<"people">) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("ProcessRequests");
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b pb-4">
      {candidates.map((candidate, index) => {
        const isActive = candidate.personId === activeId;
        return (
          <button
            key={candidate.personId}
            type="button"
            onClick={() => onSelect(candidate.personId)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30 hover:bg-muted",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[180px] truncate">
              {candidate.name || `${t("candidate")} ${index + 1}`}
            </span>
            <ExistingPersonBadge
              existingPerson={candidate.existingPerson}
              owned={candidate.personOwned}
              iconOnly
            />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Personal data (per candidate) — marital status + parentage + salary + experience
// ---------------------------------------------------------------------------

function PersonalDataStep({
  candidate,
  onPatch,
  disabled,
}: {
  candidate: CandidateFields;
  onPatch: (next: Partial<CandidateFields>) => void;
  disabled: boolean;
}) {
  const t = useTranslations("ProcessRequests");

  const isExisting = Boolean(candidate.existingPerson);
  const isProtected = isExisting && !candidate.personOwned;
  const presence = candidate.presence;

  // Mark a person field as edited so only touched fields are persisted.
  const patchPerson = (field: PersonFieldKey, value: string) =>
    onPatch({
      [field]: value,
      touched: { ...candidate.touched, [field]: true },
    });

  // For a protected (cross-tenant) person, a field the other org already filled
  // is locked (identity withheld); a truly-empty field stays editable (gap-fill).
  const lockField = (filled?: boolean) => isProtected && Boolean(filled);
  const emailLocked = lockField(presence?.hasEmail);
  const maritalLocked = lockField(presence?.hasMaritalStatus);
  const fatherLocked = lockField(presence?.hasFatherName);
  const motherLocked = lockField(presence?.hasMotherName);

  const fieldHint = (locked: boolean) =>
    isProtected ? (
      <p className="text-xs text-muted-foreground">
        {locked ? t("fieldLockedProtected") : t("fieldCanComplete")}
      </p>
    ) : null;

  return (
    <div className="space-y-8">
      {isExisting &&
        (isProtected ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-0.5">
              <p className="font-medium">{t("personalDataProtectedTitle")}</p>
              <p className="text-muted-foreground">
                {t("personalDataProtectedBody")}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
            <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="space-y-0.5">
              <p className="font-medium">{t("personalDataUpdatingTitle")}</p>
              <p className="text-muted-foreground">
                {t("personalDataUpdatingBody", {
                  name: candidate.name || t("candidate"),
                })}
              </p>
            </div>
          </div>
        ))}

      {/* Estado Civil */}
      <section className="space-y-3">
        <h3 className="border-b pb-2 text-sm font-semibold tracking-tight">
          {t("maritalStatus")}
        </h3>
        <div className="max-w-md space-y-2">
          <Label htmlFor="marital-status" className="sr-only">
            {t("maritalStatus")}
          </Label>
          <Select
            value={candidate.maritalStatus ?? ""}
            onValueChange={(value) => patchPerson("maritalStatus", value)}
            disabled={disabled || maritalLocked}
          >
            <SelectTrigger id="marital-status" className="w-full">
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
          {fieldHint(maritalLocked)}
        </div>
      </section>

      {/* Filiação */}
      <section className="space-y-3">
        <h3 className="border-b pb-2 text-sm font-semibold tracking-tight">
          {t("stepFamily")}
        </h3>
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="father-name">{t("fatherName")}</Label>
            <Input
              id="father-name"
              value={candidate.fatherName ?? ""}
              onChange={(e) => patchPerson("fatherName", e.target.value)}
              disabled={disabled || fatherLocked}
            />
            {fieldHint(fatherLocked)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mother-name">{t("motherName")}</Label>
            <Input
              id="mother-name"
              value={candidate.motherName ?? ""}
              onChange={(e) => patchPerson("motherName", e.target.value)}
              disabled={disabled || motherLocked}
            />
            {fieldHint(motherLocked)}
          </div>
        </div>
      </section>

      {/* Salário */}
      <section className="space-y-3">
        <h3 className="border-b pb-2 text-sm font-semibold tracking-tight">
          {t("salary")}
        </h3>
        <SalaryStep candidate={candidate} onPatch={onPatch} disabled={disabled} />
      </section>

      {/* Experiência Profissional */}
      <section className="space-y-3">
        <h3 className="border-b pb-2 text-sm font-semibold tracking-tight">
          {t("professionalExperience")}
        </h3>
        <div className="max-w-2xl space-y-2">
          <Label
            htmlFor="professional-experience"
            className="text-muted-foreground"
          >
            {t("optional")}
          </Label>
          <Textarea
            id="professional-experience"
            value={candidate.professionalExperience ?? ""}
            onChange={(e) =>
              onPatch({ professionalExperience: e.target.value })
            }
            rows={6}
            className="resize-none"
            disabled={disabled}
          />
        </div>
      </section>

      {/* Visto / Residência */}
      <section className="space-y-3">
        <h3 className="border-b pb-2 text-sm font-semibold tracking-tight">
          {t("stepVisa")}
        </h3>
        <ResidenceSelect
          value={{
            visaReceiptLocation: candidate.visaReceiptLocation,
            residenceCountryCode: candidate.residenceCountryCode,
            residenceCountryName: candidate.residenceCountryName,
            residenceStateCode: candidate.residenceStateCode,
            residenceCity: candidate.residenceCity,
            residenceSince: candidate.residenceSince,
            residenceAddressAbroad: candidate.residenceAddressAbroad,
            consularPost: candidate.consularPost,
          }}
          onChange={(next) => onPatch(next)}
          disabled={disabled}
        />
      </section>

      {/* Contato */}
      <section className="space-y-3">
        <h3 className="border-b pb-2 text-sm font-semibold tracking-tight">
          {t("stepContact")}
        </h3>
        <div className="max-w-2xl space-y-4">
          <div className="space-y-2">
            <Label htmlFor="candidate-email">
              {t("candidateEmail")} ({t("optional")})
            </Label>
            <Input
              id="candidate-email"
              type="email"
              value={candidate.candidateEmail ?? ""}
              onChange={(e) => patchPerson("candidateEmail", e.target.value)}
              disabled={disabled || emailLocked}
            />
            {fieldHint(emailLocked)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">
              {t("notes")} ({t("optional")})
            </Label>
            <Textarea
              id="notes"
              value={candidate.notes ?? ""}
              onChange={(e) => onPatch({ notes: e.target.value })}
              placeholder={t("notesPlaceholder")}
              rows={4}
              className="resize-none"
              disabled={disabled}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Salary (per candidate)
// ---------------------------------------------------------------------------

function SalaryStep({
  candidate,
  onPatch,
  disabled,
}: {
  candidate: CandidateFields;
  onPatch: (next: Partial<CandidateFields>) => void;
  disabled: boolean;
}) {
  const t = useTranslations("ProcessRequests");
  const getRate = useAction(api.exchangeRates.getRateToBRL);

  const [fetchingRate, setFetchingRate] = React.useState(false);
  const [autoFetched, setAutoFetched] = React.useState(false);

  const currency = candidate.lastSalaryCurrency ?? "USD";
  const isBRL = currency === "BRL";
  const symbol = CURRENCY_SYMBOLS[currency] ?? "";

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
            lastSalaryCurrency: cur,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getRate, onPatch, t],
  );

  React.useEffect(() => {
    if (!isBRL && candidate.exchangeRateToBRL === undefined) {
      void fetchRate(currency, candidate.lastSalaryAmount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCurrencyChange = (value: string) => {
    setAutoFetched(false);
    if (value === "BRL") {
      onPatch({
        lastSalaryCurrency: "BRL",
        exchangeRateToBRL: 0,
        salaryInBRL: computeBRL(candidate.lastSalaryAmount, 0, "BRL"),
      });
      return;
    }
    onPatch({ lastSalaryCurrency: value });
    void fetchRate(value, candidate.lastSalaryAmount);
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
          value={candidate.lastSalaryAmount ?? ""}
          onValueChange={(v) =>
            onPatch({
              lastSalaryAmount: v.floatValue,
              salaryInBRL: computeBRL(v.floatValue, candidate.exchangeRateToBRL),
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
              onClick={() => fetchRate(currency, candidate.lastSalaryAmount)}
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
            value={candidate.exchangeRateToBRL ?? ""}
            onValueChange={(v) => {
              setAutoFetched(false);
              onPatch({
                exchangeRateToBRL: v.floatValue,
                salaryInBRL: computeBRL(
                  candidate.lastSalaryAmount,
                  v.floatValue,
                ),
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
          value={candidate.salaryInBRL ?? ""}
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
          value={candidate.monthlyAmountToReceive ?? ""}
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
// Review (per candidate, read-only summary)
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

function ReviewStep({
  candidates,
  legalFrameworkName,
}: {
  candidates: CandidateFields[];
  legalFrameworkName?: string;
}) {
  const t = useTranslations("ProcessRequests");

  const numberToString = (value?: number) =>
    value !== undefined ? String(value) : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("legalFramework")}
        </p>
        <p className="font-medium">{legalFrameworkName ?? "—"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("candidatesCount", { count: candidates.length })}
        </p>
      </div>

      <div className="space-y-4">
        {candidates.map((candidate, index) => {
          const maritalLabel = candidate.maritalStatus
            ? t(candidate.maritalStatus as (typeof MARITAL_OPTIONS)[number])
            : undefined;
          const visaLabel = candidate.visaReceiptLocation
            ? t(candidate.visaReceiptLocation)
            : undefined;
          return (
            <div key={candidate.personId} className="rounded-lg border p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <h3 className="font-semibold">
                  {candidate.name || `${t("candidate")} ${index + 1}`}
                </h3>
                <ExistingPersonBadge
                  existingPerson={candidate.existingPerson}
                  owned={candidate.personOwned}
                />
              </div>
              {candidate.existingPerson && !candidate.personOwned && (
                <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">
                  {t("reviewProtectedNote")}
                </p>
              )}
              <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <ReviewRow
                  label={t("passportNumber")}
                  value={candidate.passportNumber}
                />
                <ReviewRow
                  label={t("candidateEmail")}
                  value={candidate.candidateEmail}
                />
                <ReviewRow label={t("maritalStatus")} value={maritalLabel} />
                <ReviewRow
                  label={t("fatherName")}
                  value={candidate.fatherName}
                />
                <ReviewRow
                  label={t("motherName")}
                  value={candidate.motherName}
                />
                <ReviewRow
                  label={t("salaryInBRL")}
                  value={numberToString(candidate.salaryInBRL)}
                />
                <ReviewRow
                  label={t("monthlyAmount")}
                  value={numberToString(candidate.monthlyAmountToReceive)}
                />
                <ReviewRow label={t("whereWillReceiveVisa")} value={visaLabel} />
                <ReviewRow
                  label={t("residenceCountry")}
                  value={candidate.residenceCountryName}
                />
                <ReviewRow
                  label={t("residenceCity")}
                  value={candidate.residenceCity}
                />
                <ReviewRow
                  label={t("consularPost")}
                  value={candidate.consularPost}
                />
              </div>
              {candidate.professionalExperience && (
                <div className="mt-2 border-t pt-2">
                  <ReviewRow
                    label={t("professionalExperience")}
                    value={candidate.professionalExperience}
                  />
                </div>
              )}
              {candidate.notes && (
                <div className="mt-2 border-t pt-2">
                  <ReviewRow label={t("notes")} value={candidate.notes} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legal framework (amparo legal) — shared across all candidates, gated by
// showInRequest. The description leads (what the client is requesting); the
// framework name is the technical detail underneath.
// ---------------------------------------------------------------------------

interface RequestFrameworkOption {
  _id: Id<"legalFrameworks">;
  name: string;
  description?: string;
  processTypeName?: string;
}

function RequestLegalFrameworkStep({
  frameworks,
  value,
  onSelect,
  disabled,
}: {
  frameworks: RequestFrameworkOption[] | undefined;
  value?: Id<"legalFrameworks">;
  onSelect: (id: Id<"legalFrameworks">, name: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("ProcessRequests");

  if (frameworks === undefined) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (frameworks.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          {t("noRequestFrameworks")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("selectLegalFrameworkHint")}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {frameworks.map((framework) => {
          const selected = framework._id === value;
          const heading = framework.description || framework.name;
          const detail = framework.description ? framework.name : undefined;
          return (
            <button
              key={framework._id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(framework._id, framework.name)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:border-muted-foreground/40 hover:bg-muted/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="text-sm font-medium leading-snug text-foreground">
                  {heading}
                </span>
                {selected && (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                )}
              </div>
              {detail && (
                <span className="text-xs text-muted-foreground">{detail}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
