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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getFieldsMetadata } from "@/lib/individual-process-fields";
import { Combobox } from "@/components/ui/combobox";
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

  // Query options for reference fields
  const passports = useQuery(api.passports.list, {});
  const people = useQuery(api.people.list, {});
  const processTypes = useQuery(api.processTypes.list, {});
  const legalFrameworks = useQuery(api.legalFrameworks.list, {});
  const cbos = useQuery(api.cboCodes.list, {});

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

  const renderFieldInput = (field: any) => {
    const { fieldName, labelKey, fieldType, referenceTable } = field;
    const label = t(`fields.${fieldName}` as any);

    // Render based on field type
    switch (fieldType) {
      case "string":
        return (
          <div key={fieldName} className="grid gap-2">
            <Label htmlFor={fieldName}>{label}</Label>
            <Input
              id={fieldName}
              value={formData[fieldName] || ""}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            />
          </div>
        );

      case "date":
      case "datetime":
        return (
          <div key={fieldName} className="grid gap-2">
            <Label htmlFor={fieldName}>{label}</Label>
            <Input
              id={fieldName}
              type={fieldType === "date" ? "date" : "datetime-local"}
              value={formData[fieldName] || ""}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            />
          </div>
        );

      case "reference":
        let options: any[] = [];
        let queryData: any = null;

        // Get the appropriate data based on reference table
        switch (referenceTable) {
          case "passports":
            queryData = passports;
            options = queryData?.map((p: any) => ({
              value: p._id,
              label: p.passportNumber || p._id,
            })) || [];
            break;
          case "people":
            queryData = people;
            options = queryData?.map((p: any) => ({
              value: p._id,
              label: p.fullName,
            })) || [];
            break;
          case "processTypes":
            queryData = processTypes;
            options = queryData?.map((p: any) => ({
              value: p._id,
              label: p.name,
            })) || [];
            break;
          case "legalFrameworks":
            queryData = legalFrameworks;
            options = queryData?.map((p: any) => ({
              value: p._id,
              label: p.name,
            })) || [];
            break;
          case "cboCodes":
            queryData = cbos;
            options = queryData?.map((p: any) => ({
              value: p._id,
              label: `${p.code} - ${p.title}`,
            })) || [];
            break;
        }

        return (
          <div key={fieldName} className="grid gap-2">
            <Label htmlFor={fieldName}>{label}</Label>
            <Combobox
              options={options}
              value={formData[fieldName]}
              onValueChange={(value) => handleFieldChange(fieldName, value)}
              placeholder={tCommon("select")}
            />
          </div>
        );

      default:
        return null;
    }
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
              fieldsMetadata.map((field) => renderFieldInput(field))
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
