"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  ScanLine,
  Upload,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface PassportCandidateResult {
  personId: Id<"people">;
  passportId: Id<"passports">;
  storageId: Id<"_storage">;
  /** Display name of the resolved candidate (for the wizard's candidate tabs/list). */
  fullName: string;
  /** Passport number used for this candidate. */
  passportNumber: string;
}

export interface PassportUploadStepProps {
  /** Add one or many resolved candidates (multi-passport selection). */
  onAdd: (results: PassportCandidateResult[]) => void | Promise<void>;
  /** Remaining capacity — at most this many passports are processed at once. */
  maxToAdd: number;
  disabled?: boolean;
}

type ExtractMatch = {
  _id: Id<"people">;
  fullName: string;
  /** False when the match belongs to another tenant (PII fields are withheld). */
  owned?: boolean;
  givenNames?: string;
  middleName?: string | null;
  surname?: string | null;
  cpf?: string | null;
  birthDate?: string | null;
  birthYear?: string | null;
  email?: string | null;
  sex?: string | null;
  maritalStatus?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  nationalityId?: Id<"countries"> | null;
};

type ExtractResult = {
  extracted: {
    givenNames?: string;
    surname?: string;
    fullName?: string;
    passportNumber?: string;
    sex?: string;
    birthDate?: string;
    issueDate?: string;
    expiryDate?: string;
    nationality?: string;
    nationalityCode?: string;
    issuingCountry?: string;
    issuingCountryCode?: string;
    mrz?: string;
  };
  nationalityId: Id<"countries"> | null;
  issuingCountryId: Id<"countries"> | null;
  matches: ExtractMatch[];
  passportExists: {
    isAvailable: boolean;
    existingPassport: {
      _id: Id<"passports">;
      passportNumber: string;
      personName: string;
    } | null;
  } | null;
};

type EditableFields = {
  givenNames: string;
  surname: string;
  passportNumber: string;
  sex: string;
  birthDate: string;
  issueDate: string;
  expiryDate: string;
  nationality: string;
  issuingCountry: string;
};

type BatchStatus = "pending" | "reading" | "resolving" | "done" | "error";
type BatchItem = {
  id: string;
  fileName: string;
  status: BatchStatus;
  name?: string;
  error?: string;
};

export function PassportUploadStep({
  onAdd,
  maxToAdd,
  disabled = false,
}: PassportUploadStepProps) {
  const t = useTranslations("ProcessRequests");

  const generateUploadUrl = useMutation(api.passportUpload.generateUploadUrl);
  const applyCandidate = useMutation(api.passportUpload.applyCandidate);
  const extractPassport = useAction(api.passportOcr.extractPassport);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isReading, setIsReading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [fields, setFields] = useState<EditableFields | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Batch (multi-passport) processing state.
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const busy = isReading || isApplying || isBatchProcessing || disabled;

  // Prevent the browser from navigating to a file dropped outside the dropzone.
  useEffect(() => {
    const prevent = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  const resetState = () => {
    setStorageId(null);
    setResult(null);
    setFields(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t("invalidFileType"));
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("fileTooLarge"));
      return false;
    }
    return true;
  };

  // --- Low-level helpers shared by single + batch flows --------------------

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadResponse.ok) throw new Error("Failed to upload file");
    const { storageId: uploaded } = (await uploadResponse.json()) as {
      storageId: Id<"_storage">;
    };
    return uploaded;
  };

  // --- Entry point: a set of files was selected/dropped --------------------

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const all = Array.from(fileList).filter(validateFile);
    if (all.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const accepted = all.slice(0, Math.max(0, maxToAdd));
    if (accepted.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (all.length > accepted.length) {
      toast.warning(t("passportsTruncated", { max: accepted.length }));
    }
    if (accepted.length === 1) {
      void processSingle(accepted[0]);
    } else {
      void processBatch(accepted);
    }
  };

  // --- Single-file flow (with manual OCR review + dedup choice) ------------

  const processSingle = async (file: File) => {
    try {
      setIsReading(true);
      setResult(null);
      setFields(null);
      const uploaded = await uploadFile(file);
      setStorageId(uploaded);
      const ocr = (await extractPassport({
        storageId: uploaded,
      })) as ExtractResult;
      setResult(ocr);
      setFields({
        givenNames: ocr.extracted.givenNames ?? "",
        surname: ocr.extracted.surname ?? "",
        passportNumber: ocr.extracted.passportNumber ?? "",
        sex: ocr.extracted.sex ?? "",
        birthDate: ocr.extracted.birthDate ?? "",
        issueDate: ocr.extracted.issueDate ?? "",
        expiryDate: ocr.extracted.expiryDate ?? "",
        nationality: ocr.extracted.nationality ?? "",
        issuingCountry: ocr.extracted.issuingCountry ?? "",
      });
    } catch (error) {
      console.error("Error reading passport:", error);
      toast.error(t("ocrError"));
      resetState();
    } finally {
      setIsReading(false);
    }
  };

  const setField = <K extends keyof EditableFields>(
    key: K,
    nextValue: EditableFields[K],
  ) => {
    setFields((prev) => (prev ? { ...prev, [key]: nextValue } : prev));
  };

  const handleUseExisting = async (personId: Id<"people">) => {
    if (!fields || !storageId) return;
    if (!fields.passportNumber.trim()) {
      toast.error(t("passportNumberRequired"));
      return;
    }
    try {
      setIsApplying(true);
      const { personId: resolvedPersonId, passportId } = await applyCandidate({
        mode: "existing",
        personId,
        fillGaps: true,
        passportNumber: fields.passportNumber.trim(),
        issuingCountryId: result?.issuingCountryId ?? undefined,
        issueDate: fields.issueDate || undefined,
        expiryDate: fields.expiryDate || undefined,
        storageId,
      });
      const matched = result?.matches.find((m) => m._id === personId);
      const fullName =
        matched?.fullName ||
        [fields.givenNames, fields.surname].filter(Boolean).join(" ").trim();
      await onAdd([
        {
          personId: resolvedPersonId,
          passportId,
          storageId,
          fullName,
          passportNumber: fields.passportNumber.trim(),
        },
      ]);
      resetState();
    } catch (error) {
      console.error("Error linking candidate:", error);
      toast.error(t("applyCandidateError"));
    } finally {
      setIsApplying(false);
    }
  };

  const handleCreateNew = async () => {
    if (!fields || !storageId) return;
    if (!fields.givenNames.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    if (!fields.passportNumber.trim()) {
      toast.error(t("passportNumberRequired"));
      return;
    }
    try {
      setIsApplying(true);
      const { personId, passportId } = await applyCandidate({
        mode: "new",
        givenNames: fields.givenNames.trim(),
        surname: fields.surname.trim() || undefined,
        sex: fields.sex || undefined,
        birthDate: fields.birthDate || undefined,
        nationalityId: result?.nationalityId ?? undefined,
        passportNumber: fields.passportNumber.trim(),
        issuingCountryId: result?.issuingCountryId ?? undefined,
        issueDate: fields.issueDate || undefined,
        expiryDate: fields.expiryDate || undefined,
        storageId,
      });
      await onAdd([
        {
          personId,
          passportId,
          storageId,
          fullName: [fields.givenNames.trim(), fields.surname.trim()]
            .filter(Boolean)
            .join(" "),
          passportNumber: fields.passportNumber.trim(),
        },
      ]);
      resetState();
    } catch (error) {
      console.error("Error creating candidate:", error);
      toast.error(t("applyCandidateError"));
    } finally {
      setIsApplying(false);
    }
  };

  // --- Batch flow (multiple files → one candidate per passport) ------------

  const processBatch = async (files: File[]) => {
    setIsBatchProcessing(true);
    const items: BatchItem[] = files.map((f, i) => ({
      id: `${i}-${f.name}`,
      fileName: f.name,
      status: "pending",
    }));
    setBatchItems(items);

    const patchItem = (id: string, patch: Partial<BatchItem>) =>
      setBatchItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      );

    const results: PassportCandidateResult[] = [];

    // Sequential: each resolved candidate is committed before the next OCR, so a
    // repeated person inside the batch surfaces as an OWNED match and is linked
    // (not duplicated).
    for (let i = 0; i < files.length; i++) {
      const item = items[i];
      try {
        patchItem(item.id, { status: "reading" });
        const uploaded = await uploadFile(files[i]);
        const ocr = (await extractPassport({
          storageId: uploaded,
        })) as ExtractResult;

        const givenNames = (ocr.extracted.givenNames ?? "").trim();
        const surname = (ocr.extracted.surname ?? "").trim();
        const passportNumber = (ocr.extracted.passportNumber ?? "").trim();
        if (!givenNames || !passportNumber) {
          patchItem(item.id, {
            status: "error",
            error: t("ocrIncomplete"),
          });
          continue;
        }

        patchItem(item.id, { status: "resolving" });
        // Auto-link only when there is EXACTLY ONE owned match — never guess
        // between homonyms in a batch; ambiguous cases create a new person.
        const ownedMatches = ocr.matches.filter((m) => m.owned);
        const ownedMatch =
          ownedMatches.length === 1 ? ownedMatches[0] : undefined;
        let personId: Id<"people">;
        let passportId: Id<"passports">;
        let fullName: string;

        if (ownedMatch) {
          const applied = await applyCandidate({
            mode: "existing",
            personId: ownedMatch._id,
            fillGaps: true,
            passportNumber,
            issuingCountryId: ocr.issuingCountryId ?? undefined,
            issueDate: ocr.extracted.issueDate || undefined,
            expiryDate: ocr.extracted.expiryDate || undefined,
            storageId: uploaded,
          });
          personId = applied.personId;
          passportId = applied.passportId;
          fullName = ownedMatch.fullName;
        } else {
          const applied = await applyCandidate({
            mode: "new",
            givenNames,
            surname: surname || undefined,
            sex: ocr.extracted.sex || undefined,
            birthDate: ocr.extracted.birthDate || undefined,
            nationalityId: ocr.nationalityId ?? undefined,
            passportNumber,
            issuingCountryId: ocr.issuingCountryId ?? undefined,
            issueDate: ocr.extracted.issueDate || undefined,
            expiryDate: ocr.extracted.expiryDate || undefined,
            storageId: uploaded,
          });
          personId = applied.personId;
          passportId = applied.passportId;
          fullName = [givenNames, surname].filter(Boolean).join(" ");
        }

        results.push({
          personId,
          passportId,
          storageId: uploaded,
          fullName,
          passportNumber,
        });
        patchItem(item.id, { status: "done", name: fullName });
      } catch (error) {
        console.error("Error processing passport:", error);
        patchItem(item.id, { status: "error", error: t("ocrError") });
      }
    }

    const failedCount = files.length - results.length;
    try {
      if (results.length > 0) {
        await onAdd(results);
        if (failedCount > 0) {
          toast.warning(t("somePassportsFailed", { count: failedCount }));
        }
      } else {
        toast.error(t("ocrError"));
      }
    } finally {
      setIsBatchProcessing(false);
      setBatchItems([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Drag and drop --------------------------------------------------------

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!busy) setIsDragging(true);
  };
  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (busy) return;
    handleFiles(event.dataTransfer.files);
  };

  // --- Batch progress view --------------------------------------------------

  if (isBatchProcessing || batchItems.length > 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <CardTitle>{t("processingPassports")}</CardTitle>
          </div>
          <CardDescription>{t("processingPassportsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {batchItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.name || item.fileName}
                  </p>
                  {item.error && (
                    <p className="truncate text-xs text-destructive">
                      {item.error}
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {item.status === "done" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : item.status === "error" ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // --- Single-file OCR review + dedup ---------------------------------------

  if (result && fields) {
    return (
      <div className="space-y-4">
        {result.passportExists?.isAvailable === false &&
          result.passportExists.existingPassport && (
            <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
              <CardContent className="flex items-start gap-3 py-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-0.5 text-sm">
                  <p className="font-medium">{t("passportAlreadyExists")}</p>
                  <p className="text-muted-foreground">
                    {result.passportExists.existingPassport.personName}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

        {result.matches.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle>{t("foundExistingCandidate")}</CardTitle>
              </div>
              <CardDescription>
                {t("foundExistingCandidateHint")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.matches.map((match) => (
                <div
                  key={match._id}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {match.fullName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {match.cpf && (
                        <Badge variant="secondary" className="font-normal">
                          {t("cpfLabel")}: {match.cpf}
                        </Badge>
                      )}
                      {match.birthDate && (
                        <Badge variant="secondary" className="font-normal">
                          {t("birthDateLabel")}: {match.birthDate}
                        </Badge>
                      )}
                      {!match.birthDate && match.birthYear && (
                        <Badge variant="secondary" className="font-normal">
                          {t("birthYearLabel")}: {match.birthYear}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleUseExisting(match._id)}
                    disabled={busy}
                    className="shrink-0"
                  >
                    {isApplying && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("useThisPerson")}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              <CardTitle>{t("reviewExtracted")}</CardTitle>
            </div>
            <CardDescription>{t("reviewExtractedHint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="given-names">{t("givenNames")}</Label>
                <Input
                  id="given-names"
                  value={fields.givenNames}
                  onChange={(e) => setField("givenNames", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">{t("surname")}</Label>
                <Input
                  id="surname"
                  value={fields.surname}
                  onChange={(e) => setField("surname", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passport-number">{t("passportNumber")}</Label>
                <Input
                  id="passport-number"
                  value={fields.passportNumber}
                  onChange={(e) => setField("passportNumber", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex">{t("sex")}</Label>
                <Input
                  id="sex"
                  value={fields.sex}
                  onChange={(e) => setField("sex", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth-date">{t("birthDate")}</Label>
                <DatePicker
                  value={fields.birthDate}
                  onChange={(v) => setField("birthDate", v || "")}
                  disabled={busy}
                  showYearMonthDropdowns
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">{t("nationality")}</Label>
                <Input
                  id="nationality"
                  value={fields.nationality}
                  onChange={(e) => setField("nationality", e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue-date">{t("issueDate")}</Label>
                <DatePicker
                  value={fields.issueDate}
                  onChange={(v) => setField("issueDate", v || "")}
                  disabled={busy}
                  showYearMonthDropdowns
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry-date">{t("expiryDate")}</Label>
                <DatePicker
                  value={fields.expiryDate}
                  onChange={(v) => setField("expiryDate", v || "")}
                  disabled={busy}
                  showYearMonthDropdowns
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="issuing-country">{t("issuingCountry")}</Label>
                <Input
                  id="issuing-country"
                  value={fields.issuingCountry}
                  onChange={(e) => setField("issuingCountry", e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetState}
                disabled={busy}
              >
                <Upload className="mr-2 h-4 w-4" />
                {t("reupload")}
              </Button>
              <Button type="button" onClick={handleCreateNew} disabled={busy}>
                {isApplying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {t("createNewCandidate")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Dropzone (idle) ------------------------------------------------------

  return (
    <Card>
      <CardContent className="py-2">
        <label
          htmlFor="passport-file"
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors",
            busy
              ? "cursor-not-allowed opacity-70"
              : "cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/40",
            isDragging && "border-primary bg-primary/10",
          )}
        >
          {isReading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <div className="flex items-center gap-2 text-sm font-medium">
                <ScanLine className="h-4 w-4" />
                {t("reading")}
              </div>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{t("uploadPassports")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("uploadPassportsHint", { max: maxToAdd })}
                </p>
              </div>
            </>
          )}
          <Input
            id="passport-file"
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(",")}
            onChange={(e) => handleFiles(e.target.files)}
            disabled={busy}
            className="sr-only"
          />
        </label>
      </CardContent>
    </Card>
  );
}
