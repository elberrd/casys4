"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Upload, Download, FileText, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { parseCSV, generatePeopleCSVTemplate, ParsedCSVResult, ParsedCSVRow } from "@/lib/utils/csv-parser";
import { bulkImportPeopleSchema } from "@/lib/validations/bulk-operations";

interface BulkImportPeopleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mainProcessId?: Id<"mainProcesses">;
  onSuccess?: () => void;
}

type ImportStep = "upload" | "preview" | "importing" | "complete";

interface ImportResult {
  successful: Id<"people">[];
  failed: Array<{ index: number; name: string; reason: string }>;
  totalProcessed: number;
}

export function BulkImportPeopleDialog({
  open,
  onOpenChange,
  mainProcessId,
  onSuccess,
}: BulkImportPeopleDialogProps) {
  const t = useTranslations("BulkImport");
  const tCommon = useTranslations("Common");

  const [step, setStep] = useState<ImportStep>("upload");
  const [parsedData, setParsedData] = useState<ParsedCSVResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkImportPeople = useMutation(api.bulkOperations.bulkImportPeople);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      setParsedData(result);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template = generatePeopleCSVTemplate();
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "people-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t("templateDownloaded"));
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.validRows.length === 0) {
      toast.error(t("noValidRows"));
      return;
    }

    setStep("importing");
    setProgress(0);

    try {
      // Prepare data for import
      const people = parsedData.validRows.map((row) => ({
        fullName: row.data.fullName,
        email: row.data.email,
        cpf: row.data.cpf,
        birthDate: row.data.birthDate,
        nationality: row.data.nationality,
        gender: row.data.gender as "Male" | "Female" | "Other" | undefined,
        maritalStatus: row.data.maritalStatus as "Single" | "Married" | "Divorced" | "Widowed" | undefined,
        phone: row.data.phone || undefined,
        currentCity: row.data.currentCity || undefined,
        currentState: row.data.currentState || undefined,
        currentCountry: row.data.currentCountry || undefined,
      }));

      // Validate with Zod schema
      const validation = bulkImportPeopleSchema.safeParse({
        people,
        mainProcessId,
      });

      if (!validation.success) {
        toast.error(t("validationFailed"));
        setStep("preview");
        return;
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      // Execute bulk import
      const result = await bulkImportPeople(validation.data);

      clearInterval(progressInterval);
      setProgress(100);

      setImportResult(result);
      setStep("complete");

      if (result.successful.length > 0) {
        toast.success(
          t("importSuccess", {
            count: result.successful.length,
            total: result.totalProcessed,
          })
        );
      }

      if (result.failed.length > 0) {
        toast.warning(
          t("importPartialFailure", {
            failed: result.failed.length,
            total: result.totalProcessed,
          })
        );
      }

      if (result.successful.length > 0 && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error importing people:", error);
      toast.error(t("importError"));
      setStep("preview");
    }
  };

  const handleClose = () => {
    setStep("upload");
    setParsedData(null);
    setImportResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>{t("uploadInstructions")}</AlertDescription>
      </Alert>

      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8">
        <Upload className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">{t("selectFile")}</p>
          <p className="text-xs text-muted-foreground">{t("csvOnly")}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {t("chooseFile")}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          {t("downloadTemplate")}
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!parsedData) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {t("totalRows")}: {parsedData.totalRows}
            </p>
            <div className="flex gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t("valid")}: {parsedData.validCount}
              </Badge>
              {parsedData.invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {t("invalid")}: {parsedData.invalidCount}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {parsedData.invalidRows.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("invalidRowsWarning", { count: parsedData.invalidRows.length })}
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("cpf")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedData.rows.map((row) => (
                <TableRow key={row.rowNumber} className={row.errors.length > 0 ? "bg-destructive/10" : ""}>
                  <TableCell className="font-medium">{row.rowNumber}</TableCell>
                  <TableCell>{row.data.fullName || "-"}</TableCell>
                  <TableCell>{row.data.email || "-"}</TableCell>
                  <TableCell>{row.data.cpf || "-"}</TableCell>
                  <TableCell>
                    {row.errors.length > 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        {t("error")}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {t("ok")}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {parsedData.invalidRows.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">{t("errorDetails")}:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {parsedData.invalidRows.slice(0, 5).map((row) => (
                  <li key={row.rowNumber}>
                    {t("row")} {row.rowNumber}: {row.errors.join(", ")}
                  </li>
                ))}
                {parsedData.invalidRows.length > 5 && (
                  <li>{t("andMoreErrors", { count: parsedData.invalidRows.length - 5 })}</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="space-y-4 py-8">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium">{t("importing")}</p>
          <p className="text-xs text-muted-foreground">
            {t("pleaseWait")}
          </p>
        </div>
        <div className="w-full max-w-sm">
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {progress}%
          </p>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => {
    if (!importResult) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 py-4">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <p className="text-lg font-medium">{t("importComplete")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {importResult.successful.length}
            </p>
            <p className="text-sm text-muted-foreground">{t("successful")}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {importResult.failed.length}
            </p>
            <p className="text-sm text-muted-foreground">{t("failed")}</p>
          </div>
        </div>

        {importResult.failed.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">{t("failedImports")}:</p>
              <ScrollArea className="h-32">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {importResult.failed.map((item, idx) => (
                    <li key={idx}>
                      Row {item.index}: {item.name} - {item.reason}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === "upload" && renderUploadStep()}
          {step === "preview" && renderPreviewStep()}
          {step === "importing" && renderImportingStep()}
          {step === "complete" && renderCompleteStep()}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              {tCommon("cancel")}
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setParsedData(null);
                }}
              >
                {tCommon("back")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!parsedData || parsedData.validCount === 0}
              >
                {t("import")} ({parsedData?.validCount || 0} {t("people")})
              </Button>
            </>
          )}
          {step === "complete" && (
            <Button onClick={handleClose}>{tCommon("close")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
