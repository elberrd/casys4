"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EditStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusId: Id<"individualProcessStatuses">;
  currentNotes?: string;
  currentMaxDeliveryDate?: string;
  currentClientDeadlineDate?: string;
  isExigencia: boolean;
}

export function EditStatusDialog({
  open,
  onOpenChange,
  statusId,
  currentNotes,
  currentMaxDeliveryDate,
  currentClientDeadlineDate,
  isExigencia,
}: EditStatusDialogProps) {
  const t = useTranslations("IndividualProcesses");
  const tCommon = useTranslations("Common");

  const [notes, setNotes] = useState(currentNotes || "");
  const [maxDeliveryDate, setMaxDeliveryDate] = useState(currentMaxDeliveryDate || "");
  const [clientDeadlineDate, setClientDeadlineDate] = useState(currentClientDeadlineDate || "");
  const [isSaving, setIsSaving] = useState(false);

  const updateStatus = useMutation(api.individualProcessStatuses.updateStatus);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateStatus({
        statusId,
        notes,
        ...(isExigencia
          ? {
              maxDeliveryDate: maxDeliveryDate || undefined,
              clientDeadlineDate: clientDeadlineDate || undefined,
            }
          : {}),
      });
      toast.success(t("statusUpdated"));
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(tCommon("error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editStatusDetails")}</DialogTitle>
          <DialogDescription>{t("editStatusDetailsDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-notes">{t("addNotesPlaceholder")}</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {isExigencia && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-client-deadline">{t("clientDeadline")}</Label>
                <Input
                  id="edit-client-deadline"
                  type="date"
                  value={clientDeadlineDate}
                  onChange={(e) => setClientDeadlineDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-delivery">{t("maxDeliveryDate")}</Label>
                <Input
                  id="edit-max-delivery"
                  type="date"
                  value={maxDeliveryDate}
                  onChange={(e) => setMaxDeliveryDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
