"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { getNextAllowedIndividualStatuses } from "@/lib/utils/status-validation";

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualProcessId: Id<"individualProcesses">;
  currentStatus: string;
  onSuccess?: () => void;
}

export function StatusUpdateDialog({
  open,
  onOpenChange,
  individualProcessId,
  currentStatus,
  onSuccess,
}: StatusUpdateDialogProps) {
  const t = useTranslations("StatusUpdate");
  const tCommon = useTranslations("Common");
  const tStatuses = useTranslations("ProcessStatuses.individualProcess");

  const [newStatus, setNewStatus] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateStatus = useMutation(api.individualProcesses.update);

  // Get allowed next statuses
  const allowedStatuses = getNextAllowedIndividualStatuses(currentStatus);

  const handleSubmit = async () => {
    if (!newStatus) {
      toast.error(t("selectStatusError"));
      return;
    }

    try {
      setIsSubmitting(true);

      await updateStatus({
        id: individualProcessId,
        status: newStatus,
      });

      toast.success(t("updateSuccess"));

      // Reset form
      setNewStatus("");
      setNotes("");

      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(t("updateError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setNewStatus("");
      setNotes("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="space-y-2">
            <Label>{t("currentStatus")}</Label>
            <div className="flex items-center gap-2">
              <StatusBadge status={currentStatus} type="individual_process" />
            </div>
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
                    {t("noAllowedStatuses")}
                  </div>
                ) : (
                  allowedStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <span>{tStatuses(status)}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {allowedStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("noTransitionsAvailable")}
              </p>
            )}
          </div>

          {/* Status Change Preview */}
          {newStatus && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">{t("preview")}</p>
              <div className="flex items-center gap-2">
                <StatusBadge status={currentStatus} type="individual_process" />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <StatusBadge status={newStatus} type="individual_process" />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {t("notes")} <span className="text-muted-foreground">({tCommon("optional")})</span>
            </Label>
            <Textarea
              id="notes"
              placeholder={t("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">{t("notesDescription")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !newStatus || allowedStatuses.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("updateStatus")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
