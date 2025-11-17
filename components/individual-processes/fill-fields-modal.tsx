"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { getFieldsMetadata } from "@/lib/individual-process-fields";
import { DynamicFieldRenderer } from "./dynamic-field-renderer";
import { Loader2 } from "lucide-react";

interface FillFieldsModalProps {
  individualProcessId: Id<"individualProcesses">;
  statusId: Id<"individualProcessStatuses">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FillFieldsModal({
  individualProcessId,
  statusId,
  open,
  onOpenChange,
}: FillFieldsModalProps) {
  const t = useTranslations("IndividualProcesses");
  const tCommon = useTranslations("Common");

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query fillable fields configuration for this status
  const fillableFieldsData = useQuery(
    api.individualProcessStatuses.getFillableFields,
    open ? { statusId } : "skip"
  );

  // Save filled fields mutation
  const saveFilledFields = useMutation(api.individualProcessStatuses.saveFilledFields);

  // Get field metadata for the fillable fields
  const fillableFields = fillableFieldsData?.fillableFields || [];
  const fieldsMetadata = getFieldsMetadata(fillableFields);

  // Reset form when modal opens or status changes
  useEffect(() => {
    if (open) {
      // Always clear form data first when status changes
      setFormData({});

      // Then populate with existing data if available
      if (fillableFieldsData?.filledFieldsData) {
        // Only include fields that are actually fillable for this status
        const fillableFieldNames = fillableFieldsData.fillableFields || [];
        const filteredData: Record<string, any> = {};

        for (const [key, value] of Object.entries(fillableFieldsData.filledFieldsData)) {
          if (fillableFieldNames.includes(key)) {
            filteredData[key] = value;
          }
        }

        setFormData(filteredData);
      }
    }
  }, [open, statusId, fillableFieldsData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent form
    setIsSubmitting(true);

    try {
      await saveFilledFields({
        statusId,
        filledFieldsData: formData,
      });

      toast.success(t("fieldsSaved"));
      onOpenChange(false);
      // Don't reset formData here - let the effect handle it when modal reopens
    } catch (error) {
      console.error("Error saving filled fields:", error);
      toast.error(t("fieldsError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("fillFieldsModalTitle")}</DialogTitle>
            <DialogDescription>
              {t("fillFieldsModalDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {fillableFieldsData === undefined ? (
              // Loading state while data is being fetched
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{tCommon("loading")}...</p>
              </div>
            ) : fieldsMetadata.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noFieldsSelected")}
              </p>
            ) : (
              <DynamicFieldRenderer
                fieldsMetadata={fieldsMetadata}
                formData={formData}
                onFieldChange={handleFieldChange}
                isLoading={false}
              />
            )}
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
            <Button type="submit" disabled={isSubmitting || fieldsMetadata.length === 0 || fillableFieldsData === undefined}>
              {isSubmitting ? t("savingFields") : t("saveFields")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
