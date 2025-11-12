"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddStatusDialogProps {
  individualProcessId: Id<"individualProcesses">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddStatusDialog({
  individualProcessId,
  open,
  onOpenChange,
}: AddStatusDialogProps) {
  const t = useTranslations("IndividualProcesses");
  const tCommon = useTranslations("Common");

  const [selectedStatusId, setSelectedStatusId] = useState<Id<"caseStatuses"> | "">("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query active case statuses
  const caseStatuses = useQuery(api.caseStatuses.listActive);
  const addStatus = useMutation(api.individualProcessStatuses.addStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStatusId) {
      toast.error(t("statusRequired"));
      return;
    }

    // Validate date format
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error(t("invalidDate"));
      return;
    }

    setIsSubmitting(true);

    try {
      await addStatus({
        individualProcessId,
        caseStatusId: selectedStatusId as Id<"caseStatuses">,
        date: date || undefined,
        notes: notes || undefined,
      });

      toast.success(t("statusAdded"));
      onOpenChange(false);

      // Reset form
      setSelectedStatusId("");
      setDate(new Date().toISOString().split('T')[0]);
      setNotes("");
    } catch (error) {
      console.error("Error adding status:", error);
      toast.error(tCommon("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("addStatus")}</DialogTitle>
            <DialogDescription>
              {t("addStatusDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">{t("status")}</Label>
              <Select
                value={selectedStatusId as string}
                onValueChange={(value) => setSelectedStatusId(value as Id<"caseStatuses">)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder={t("selectStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {caseStatuses?.map((status) => (
                    <SelectItem key={status._id} value={status._id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">{t("statusDate")}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("addNotesPlaceholder")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedStatusId}>
              {isSubmitting ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
