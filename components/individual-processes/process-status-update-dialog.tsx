"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProcessStatus = "Atual" | "Anterior";

interface ConflictingProcess {
  id: Id<"individualProcesses">;
  referenceNumber?: string;
  processTypeName?: string;
  legalFrameworkName?: string;
}

interface ProcessStatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualProcessId: Id<"individualProcesses">;
  currentStatus: ProcessStatus;
}

export function ProcessStatusUpdateDialog({
  open,
  onOpenChange,
  individualProcessId,
  currentStatus,
}: ProcessStatusUpdateDialogProps) {
  const t = useTranslations("IndividualProcesses");
  const tCommon = useTranslations("Common");
  const [newStatus, setNewStatus] = useState<ProcessStatus | "">("");
  const [conflictingProcess, setConflictingProcess] =
    useState<ConflictingProcess | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateProcessStatus = useMutation(
    api.individualProcesses.updateProcessStatus,
  );

  const getStatusLabel = (status: ProcessStatus) =>
    status === "Atual"
      ? t("processStatusCurrent")
      : t("processStatusPrevious");

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    if (!nextOpen) {
      setNewStatus("");
      setConflictingProcess(null);
    }
    onOpenChange(nextOpen);
  };

  const finishSuccessfully = () => {
    toast.success(t("updateProcessStatusSuccess"));
    setNewStatus("");
    setConflictingProcess(null);
    onOpenChange(false);
  };

  const submitStatusChange = async (replaceExistingCurrent: boolean) => {
    if (!newStatus || newStatus === currentStatus || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await updateProcessStatus({
        id: individualProcessId,
        processStatus: newStatus,
        replaceExistingCurrent,
      });

      if (result.status === "conflict") {
        setConflictingProcess(result.conflictingProcess);
        return;
      }

      finishSuccessfully();
    } catch (error) {
      console.error("Error updating process status:", error);
      toast.error(t("updateProcessStatusError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const conflictingProcessDetails = conflictingProcess
    ? [
        conflictingProcess.processTypeName,
        conflictingProcess.legalFrameworkName,
        conflictingProcess.referenceNumber
          ? `${t("referenceNumber")}: ${conflictingProcess.referenceNumber}`
          : undefined,
      ].filter((detail): detail is string => Boolean(detail))
    : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {conflictingProcess
              ? t("currentProcessConflictTitle")
              : t("updateProcessStatusTitle")}
          </DialogTitle>
          <DialogDescription>
            {conflictingProcess
              ? t("currentProcessConflictDescription")
              : t("updateProcessStatusDescription")}
          </DialogDescription>
        </DialogHeader>

        {conflictingProcess ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>{t("currentProcessConflictExistingLabel")}</AlertTitle>
            <AlertDescription className="text-amber-900/80">
              <p className="break-words">
                {conflictingProcessDetails.length > 0
                  ? conflictingProcessDetails.join(" • ")
                  : t("currentProcessConflictFallback")}
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>{t("currentProcessStatus")}</Label>
              <div>
                <Badge variant={currentStatus === "Atual" ? "default" : "secondary"}>
                  {getStatusLabel(currentStatus)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-process-status">
                {t("newProcessStatus")}
              </Label>
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as ProcessStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="new-process-status" className="w-full">
                  <SelectValue placeholder={t("selectProcessStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Atual" disabled={currentStatus === "Atual"}>
                    {t("processStatusCurrent")}
                  </SelectItem>
                  <SelectItem
                    value="Anterior"
                    disabled={currentStatus === "Anterior"}
                  >
                    {t("processStatusPrevious")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (conflictingProcess) {
                setConflictingProcess(null);
              } else {
                handleOpenChange(false);
              }
            }}
            disabled={isSubmitting}
          >
            {conflictingProcess
              ? t("currentProcessConflictBack")
              : tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => submitStatusChange(Boolean(conflictingProcess))}
            disabled={!newStatus || newStatus === currentStatus || isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {conflictingProcess
              ? isSubmitting
                ? t("currentProcessConflictConfirming")
                : t("currentProcessConflictConfirm")
              : isSubmitting
                ? tCommon("saving")
                : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
