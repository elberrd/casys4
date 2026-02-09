"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Loader2, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { DynamicFieldRenderer } from "../individual-processes/dynamic-field-renderer";
import { getFieldsMetadata } from "@/lib/individual-process-fields";
import { Input } from "@/components/ui/input";

// Helper function to get current datetime in ISO format for datetime-local input
const getDefaultDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface CollectiveStatusUpdateDialogProps {
  collectiveProcessId: Id<"collectiveProcesses">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type UpdateStep = "configure" | "updating" | "complete";

interface UpdateResult {
  successful: Id<"individualProcesses">[];
  failed: Array<{ processId: Id<"individualProcesses">; reason: string }>;
  totalProcessed: number;
}

export function CollectiveStatusUpdateDialog({
  collectiveProcessId,
  open,
  onOpenChange,
  onSuccess,
}: CollectiveStatusUpdateDialogProps) {
  const t = useTranslations("CollectiveStatusUpdate");
  const tCommon = useTranslations("Common");
  const tIndividual = useTranslations("IndividualProcesses");

  const [step, setStep] = useState<UpdateStep>("configure");
  const [selectedStatusId, setSelectedStatusId] = useState<Id<"caseStatuses"> | "">("");
  const [date, setDate] = useState(getDefaultDateTime());
  const [notes, setNotes] = useState("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);

  // Query collective process with individual processes
  const collectiveProcess = useQuery(api.collectiveProcesses.get, { id: collectiveProcessId });

  // Query active case statuses
  const caseStatuses = useQuery(api.caseStatuses.listActive);

  // Query fillable fields for the selected status
  const fillableFieldsData = useQuery(
    api.caseStatuses.getFillableFieldsForCaseStatus,
    selectedStatusId && selectedStatusId !== "" ? { caseStatusId: selectedStatusId as Id<"caseStatuses"> } : "skip"
  );

  // Get field metadata for the fillable fields
  const fillableFields = fillableFieldsData?.fillableFields || [];
  const fieldsMetadata = getFieldsMetadata(fillableFields);

  // Mutation
  const updateCollectiveStatuses = useMutation(api.collectiveProcesses.updateCollectiveProcessStatuses);

  // Get individual processes
  const individualProcesses = collectiveProcess?.individualProcesses || [];

  // Calculate most common current status order number to suggest next status
  const suggestedNextStatus = useMemo(() => {
    if (!caseStatuses || !individualProcesses.length) return null;

    // Get the most common current case status order number
    const orderNumberCounts = new Map<number, number>();
    for (const ip of individualProcesses) {
      if (ip.caseStatus?.orderNumber !== undefined) {
        const count = orderNumberCounts.get(ip.caseStatus.orderNumber) || 0;
        orderNumberCounts.set(ip.caseStatus.orderNumber, count + 1);
      }
    }

    // Find the most common order number
    let mostCommonOrderNumber = 0;
    let maxCount = 0;
    for (const [orderNumber, count] of orderNumberCounts.entries()) {
      if (count > maxCount) {
        mostCommonOrderNumber = orderNumber;
        maxCount = count;
      }
    }

    // Find the next status by order number
    const sortedStatuses = [...caseStatuses].sort((a, b) =>
      (a.orderNumber || 0) - (b.orderNumber || 0)
    );

    const nextStatus = sortedStatuses.find(
      (status) => (status.orderNumber || 0) > mostCommonOrderNumber
    );

    return nextStatus || null;
  }, [caseStatuses, individualProcesses]);

  // Auto-select suggested status when dialog opens
  useEffect(() => {
    if (open && suggestedNextStatus && !selectedStatusId) {
      setSelectedStatusId(suggestedNextStatus._id);
    }
  }, [open, suggestedNextStatus, selectedStatusId]);

  // Reset form data when status changes or dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({});
      setSelectedStatusId("");
      setNotes("");
      setDate(getDefaultDateTime());
      setStep("configure");
      setUpdateResult(null);
    }
  }, [open]);

  // Clear form data when status changes
  useEffect(() => {
    setFormData({});
  }, [selectedStatusId]);

  // Count processes by current status
  const statusCounts = useMemo(() => {
    const counts: Record<string, { name: string; count: number; orderNumber?: number }> = {};
    for (const ip of individualProcesses) {
      const statusId = ip.caseStatusId || "unknown";
      const statusName = ip.caseStatus?.name || "Unknown";
      const orderNumber = ip.caseStatus?.orderNumber;
      if (!counts[statusId]) {
        counts[statusId] = { name: statusName, count: 0, orderNumber };
      }
      counts[statusId].count++;
    }
    return Object.values(counts);
  }, [individualProcesses]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedStatusId) {
      toast.error(t("noStatusSelected"));
      return;
    }

    // Validate date format (accepts date or datetime)
    if (date && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(date)) {
      toast.error(tIndividual("invalidDate"));
      return;
    }

    setStep("updating");
    setIsSubmitting(true);

    try {
      // Filter out empty values from form data
      const filteredFormData: Record<string, any> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== "" && value !== null && value !== undefined) {
          filteredFormData[key] = value;
        }
      }

      const result = await updateCollectiveStatuses({
        collectiveProcessId,
        caseStatusId: selectedStatusId as Id<"caseStatuses">,
        date: date || getDefaultDateTime(),
        notes: notes || undefined,
        filledFieldsData: Object.keys(filteredFormData).length > 0 ? filteredFormData : undefined,
      });

      setUpdateResult(result);
      setStep("complete");

      if (result.successful.length > 0) {
        toast.success(t("updateSuccess", { count: result.successful.length }));
      }

      if (result.failed.length > 0) {
        toast.warning(
          t("updatePartialSuccess", {
            successful: result.successful.length,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("configure");
    setSelectedStatusId("");
    setDate(getDefaultDateTime());
    setNotes("");
    setFormData({});
    setUpdateResult(null);
    onOpenChange(false);
  };

  const renderConfigureStep = () => (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        {/* Summary of processes to update */}
        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            {t("processCount", { count: individualProcesses.length })}
          </AlertDescription>
        </Alert>

        {/* Current status distribution */}
        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <p className="text-sm font-medium">{t("currentStatusDistribution")}</p>
          <div className="flex flex-wrap gap-2">
            {statusCounts.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <Badge variant="outline">
                  {item.name}
                  {item.orderNumber !== undefined && (
                    <span className="ml-1 text-xs opacity-70">#{item.orderNumber}</span>
                  )}
                </Badge>
                <span className="text-xs text-muted-foreground">×{item.count}</span>
              </div>
            ))}
          </div>
          {suggestedNextStatus && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <ArrowRight className="h-4 w-4" />
              <span>{t("suggestedNext")}: {suggestedNextStatus.name}</span>
            </div>
          )}
        </div>

        {/* Status selection */}
        <div className="grid gap-2">
          <Label htmlFor="status">{t("newStatus")}</Label>
          <Select
            value={selectedStatusId as string}
            onValueChange={(value) => setSelectedStatusId(value as Id<"caseStatuses">)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder={t("selectStatus")} />
            </SelectTrigger>
            <SelectContent>
              {caseStatuses?.map((status) => {
                const isSuggested = suggestedNextStatus?._id === status._id;
                return (
                  <SelectItem key={status._id} value={status._id}>
                    <div className="flex items-center gap-2">
                      <span>{status.name}</span>
                      {status.orderNumber !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          #{status.orderNumber}
                        </Badge>
                      )}
                      {isSuggested && (
                        <Badge variant="secondary" className="text-xs">
                          {t("suggestedStatus")}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Date and Time */}
        <div className="grid gap-2">
          <Label htmlFor="date">{tIndividual("statusDateTime")}</Label>
          <Input
            id="date"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Dynamic Fields Section */}
        {selectedStatusId && selectedStatusId !== "" && (
          <>
            {fillableFieldsData === undefined ? (
              <DynamicFieldRenderer
                fieldsMetadata={[]}
                formData={formData}
                onFieldChange={handleFieldChange}
                isLoading={true}
              />
            ) : fieldsMetadata.length > 0 ? (
              <DynamicFieldRenderer
                fieldsMetadata={fieldsMetadata}
                formData={formData}
                onFieldChange={handleFieldChange}
                isLoading={false}
              />
            ) : null}
          </>
        )}

        {/* Notes */}
        <div className="grid gap-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting || !selectedStatusId}>
          {isSubmitting ? tCommon("saving") : t("updateStatus")} ({individualProcesses.length})
        </Button>
      </DialogFooter>
    </form>
  );

  const renderUpdatingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium">{t("updating")}</p>
        <p className="text-sm text-muted-foreground">{t("pleaseWait")}</p>
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
                    const ip = individualProcesses.find((p) => p._id === item.processId);
                    const personName = ip?.person?.fullName || "Unknown";
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

        <DialogFooter>
          <Button onClick={handleClose}>{tCommon("close")}</Button>
        </DialogFooter>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === "configure" && renderConfigureStep()}
          {step === "updating" && renderUpdatingStep()}
          {step === "complete" && renderCompleteStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
