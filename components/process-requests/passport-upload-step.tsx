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
}

export interface PassportUploadStepProps {
  value?: {
    personId?: Id<"people">;
    passportId?: Id<"passports">;
    storageId?: Id<"_storage">;
    summary?: string;
  };
  onComplete: (r: PassportCandidateResult) => void;
  disabled?: boolean;
}

type ExtractMatch = {
  _id: Id<"people">;
  fullName: string;
  givenNames?: string;
  middleName?: string;
  surname?: string;
  cpf?: string;
  birthDate?: string;
  email?: string;
  sex?: string;
  maritalStatus?: string;
  fatherName?: string;
  motherName?: string;
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

export function PassportUploadStep({
  value,
  onComplete,
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

  const completed = Boolean(value?.personId && value?.passportId);
  const busy = isReading || isApplying || disabled;

  // Prevent the browser from navigating to (and discarding the draft for) a file
  // that is accidentally dropped outside the dropzone while this step is active.
  useEffect(() => {
    if (completed) return;
    const prevent = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, [completed]);

  const resetState = () => {
    setStorageId(null);
    setResult(null);
    setFields(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t("invalidFileType"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("fileTooLarge"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setIsReading(true);
      setResult(null);
      setFields(null);

      // 1. Upload the file to Convex storage.
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId: uploadedStorageId } = (await uploadResponse.json()) as {
        storageId: Id<"_storage">;
      };
      setStorageId(uploadedStorageId);

      // 2. Run OCR on the uploaded passport.
      const ocr = (await extractPassport({
        storageId: uploadedStorageId,
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
  };

  // Drag-and-drop. preventDefault on dragOver is REQUIRED, otherwise the
  // browser navigates to the dropped file instead of firing onDrop.
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
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
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

      toast.success(t("candidateLinked"));
      onComplete({ personId: resolvedPersonId, passportId, storageId });
    } catch (error) {
      console.error("Error linking candidate:", error);
      toast.error(t("applyCandidateError"));
    } finally {
      setIsApplying(false);
    }
  };

  const handleCreateNew = async () => {
    if (!fields || !storageId) return;

    if (!fields.givenNames.trim() || !fields.surname.trim()) {
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
        surname: fields.surname.trim(),
        sex: fields.sex || undefined,
        birthDate: fields.birthDate || undefined,
        nationalityId: result?.nationalityId ?? undefined,
        passportNumber: fields.passportNumber.trim(),
        issuingCountryId: result?.issuingCountryId ?? undefined,
        issueDate: fields.issueDate || undefined,
        expiryDate: fields.expiryDate || undefined,
        storageId,
      });

      toast.success(t("candidateCreated"));
      onComplete({ personId, passportId, storageId });
    } catch (error) {
      console.error("Error creating candidate:", error);
      toast.error(t("applyCandidateError"));
    } finally {
      setIsApplying(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Completed state: show a summary card with a re-upload option.
  // ---------------------------------------------------------------------------
  if (completed) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <CardTitle>{t("candidateReady")}</CardTitle>
          </div>
          <CardDescription>{t("candidateReadyHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium truncate">
              {value?.summary ?? t("passportLinked")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetState}
            disabled={disabled}
            className="shrink-0"
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("reupload")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dropzone-style upload card */}
      {!result && (
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
                    <p className="text-sm font-medium">{t("uploadPassport")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("uploadPassportHint")}
                    </p>
                  </div>
                </>
              )}
              <Input
                id="passport-file"
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={handleFileSelect}
                disabled={busy}
                className="sr-only"
              />
            </label>
          </CardContent>
        </Card>
      )}

      {/* OCR review + dedup resolution */}
      {result && fields && (
        <div className="space-y-4">
          {/* Passport already exists warning */}
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

          {/* Existing candidate matches */}
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
                      <p className="text-sm font-medium truncate">
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

          {/* Editable extracted fields */}
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
                <Button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={busy}
                >
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
      )}
    </div>
  );
}
