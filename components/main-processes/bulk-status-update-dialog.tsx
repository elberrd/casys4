"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { getNextAllowedIndividualStatuses } from "@/lib/utils/status-validation";
import { bulkUpdateIndividualProcessStatusSchema } from "@/lib/validations/bulk-operations";

interface BulkStatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProcesses: Array<{
    _id: Id<"individualProcesses">;
    personId: Id<"people">;
    status: string;
  }>;
  onSuccess?: () => void;
}

type UpdateStep = "configure" | "updating" | "complete";

interface UpdateResult {
  successful: Id<"individualProcesses">[];
  failed: Array<{ processId: Id<"individualProcesses">; reason: string }>;
  totalProcessed: number;
}

export function BulkStatusUpdateDialog({
  open,
  onOpenChange,
  selectedProcesses,
  onSuccess,
}: BulkStatusUpdateDialogProps) {
  const t = useTranslations("BulkStatusUpdate");
  const tCommon = useTranslations("Common");
  const tStatuses = useTranslations("ProcessStatuses.individualProcess");

  const [step, setStep] = useState<UpdateStep>("configure");
  const [newStatus, setNewStatus] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);

  // Fetch people data for selected processes
  const people = useQuery(api.people.list, {}) ?? [];

  const bulkUpdateStatus = useMutation(api.bulkOperations.bulkUpdateIndividualProcessStatus);

  // Build person map
  const personMap = useMemo(() => {
    const map = new Map<Id<"people">, string>();
    people.forEach((p) => map.set(p._id, p.fullName));
    return map;
  }, [people]);

  // Get processes with person names
  const processesWithNames = useMemo(() => {
    return selectedProcesses.map((proc) => ({
      ...proc,
      personName: personMap.get(proc.personId) || "Unknown",
    }));
  }, [selectedProcesses, personMap]);

  // Get common allowed statuses across all selected processes
  const getCommonAllowedStatuses = (): string[] => {
    if (selectedProcesses.length === 0) return [];

    // Get allowed statuses for first process
    let commonStatuses = getNextAllowedIndividualStatuses(
      selectedProcesses[0].status
    );

    // Intersect with allowed statuses for remaining processes
    for (let i = 1; i < selectedProcesses.length; i++) {
      const allowed = getNextAllowedIndividualStatuses(
        selectedProcesses[i].status
      );
      commonStatuses = commonStatuses.filter((status) =>
        allowed.includes(status)
      );
    }

    return commonStatuses;
  };

  const allowedStatuses = getCommonAllowedStatuses();

  // Identify processes with invalid transitions
  const processesWithInvalidTransition = useMemo(() => {
    if (!newStatus) return [];

    return selectedProcesses.filter((proc) => {
      const allowed = getNextAllowedIndividualStatuses(proc.status);
      return !allowed.includes(newStatus);
    });
  }, [selectedProcesses, newStatus]);

  // Count processes by current status
  const statusCounts = selectedProcesses.reduce((acc, proc) => {
    acc[proc.status] = (acc[proc.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleUpdate = async () => {
    if (!newStatus) {
      toast.error(t("selectStatusError"));
      return;
    }

    // Validate with Zod
    const validation = bulkUpdateIndividualProcessStatusSchema.safeParse({
      individualProcessIds: selectedProcesses.map((p) => p._id),
      newStatus,
      reason: reason || undefined,
    });

    if (!validation.success) {
      toast.error(t("validationFailed"));
      console.error("Validation errors:", validation.error);
      return;
    }

    setStep("updating");
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      // Execute bulk update
      const result = await bulkUpdateStatus(validation.data);

      clearInterval(progressInterval);
      setProgress(100);

      setUpdateResult(result);
      setStep("complete");

      if (result.successful.length > 0) {
        toast.success(
          t("updateSuccess", {
            count: result.successful.length,
            total: result.totalProcessed,
          })
        );
      }

      if (result.failed.length > 0) {
        toast.warning(
          t("updatePartialFailure", {
            failed: result.failed.length,
            total: result.totalProcessed,
          })
        );
      }

      if (result.successful.length > 0 && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating statuses:", error);
      toast.error(t("updateError"));
      setStep("configure");
    }
  };

  const handleClose = () => {
    setStep("configure");
    setNewStatus("");
    setReason("");
    setProgress(0);
    setUpdateResult(null);
    onOpenChange(false);
  };

  const renderConfigureStep = () => (
    <div className="space-y-4">
      {/* Selected Processes List */}
      <div className="space-y-2">
        <Label>{t("selectedProcesses")}</Label>
        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {t("totalSelected", { count: selectedProcesses.length })}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-1">
                  <StatusBadge status={status} type="individual_process" />
                  <span className="text-xs text-muted-foreground">×{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ScrollArea className="h-[200px] rounded-md border">
          <div className="p-3 space-y-2">
            {processesWithNames.map((proc) => (
              <div
                key={proc._id}
                className="flex items-center justify-between p-2 rounded-md bg-background border"
              >
                <span className="text-sm font-medium truncate">
                  {proc.personName}
                </span>
                <StatusBadge status={proc.status} type="individual_process" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* New Status */}
      <div className="space-y-2">
        <Label htmlFor="newStatus">
          {t("newStatus")} <span className="text-destructive">*</span>
        </Label>
        <Select value={newStatus} onValueChange={setNewStatus}>
          <SelectTrigger id="newStatus">
            <SelectValue placeholder={t("selectNewStatus")} />
          </SelectTrigger>
          <SelectContent>
            {allowedStatuses.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                {t("noCommonStatuses")}
              </div>
            ) : (
              allowedStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {tStatuses(status)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {allowedStatuses.length === 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">{t("noCommonStatusesTitle")}</p>
              <p className="text-sm mt-1">{t("noCommonStatusesDescription")}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Show warning for invalid transitions */}
        {processesWithInvalidTransition.length > 0 && newStatus && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">
                {t("invalidTransitionsWarning", {
                  count: processesWithInvalidTransition.length,
                })}
              </p>
              <p className="text-sm mt-1">
                {t("invalidTransitionsDescription")}
              </p>
              <ul className="text-sm mt-2 space-y-1">
                {processesWithInvalidTransition.slice(0, 3).map((proc) => (
                  <li key={proc._id}>
                    • {personMap.get(proc.personId) || "Unknown"} ({tStatuses(proc.status)})
                  </li>
                ))}
                {processesWithInvalidTransition.length > 3 && (
                  <li>
                    {t("andMore", {
                      count: processesWithInvalidTransition.length - 3,
                    })}
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Reason/Notes */}
      <div className="space-y-2">
        <Label htmlFor="reason">
          {t("reason")}{" "}
          <span className="text-muted-foreground">({tCommon("optional")})</span>
        </Label>
        <Textarea
          id="reason"
          placeholder={t("reasonPlaceholder")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">{t("reasonDescription")}</p>
      </div>
    </div>
  );

  const renderUpdatingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium">{t("updating")}</p>
        <p className="text-sm text-muted-foreground">{t("pleaseWait")}</p>
      </div>
      <div className="w-full max-w-sm">
        <Progress value={progress} className="h-2" />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {progress}%
        </p>
      </div>
    </div>
  );

  const renderCompleteStep = () => {
    if (!updateResult) return null;

    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-lg font-medium">{t("updateComplete")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {updateResult.successful.length}
            </p>
            <p className="text-sm text-muted-foreground">{t("successful")}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {updateResult.failed.length}
            </p>
            <p className="text-sm text-muted-foreground">{t("failed")}</p>
          </div>
        </div>

        {updateResult.failed.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">{t("failedUpdates")}:</p>
              <ScrollArea className="h-32">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {updateResult.failed.map((item, index) => {
                    const proc = selectedProcesses.find((p) => p._id === item.processId);
                    const personName = proc ? personMap.get(proc.personId) : "Unknown";
                    return (
                      <li key={index}>
                        {personName}: {item.reason}
                      </li>
                    );
                  })}
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { count: selectedProcesses.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === "configure" && renderConfigureStep()}
          {step === "updating" && renderUpdatingStep()}
          {step === "complete" && renderCompleteStep()}
        </div>

        <DialogFooter>
          {step === "configure" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!newStatus || allowedStatuses.length === 0}
              >
                {t("updateStatus")} ({selectedProcesses.length})
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
