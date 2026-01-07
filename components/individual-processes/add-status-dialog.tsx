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
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, ChevronsUpDown } from "lucide-react";
import { DynamicFieldRenderer } from "./dynamic-field-renderer";
import { getFieldsMetadata } from "@/lib/individual-process-fields";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Query active case statuses
  const caseStatuses = useQuery(api.caseStatuses.listActive);
  const addStatus = useMutation(api.individualProcessStatuses.addStatus);

  // Query fillable fields for the selected status
  const fillableFieldsData = useQuery(
    api.caseStatuses.getFillableFieldsForCaseStatus,
    selectedStatusId && selectedStatusId !== "" ? { caseStatusId: selectedStatusId as Id<"caseStatuses"> } : "skip"
  );

  // Get field metadata for the fillable fields
  const fillableFields = fillableFieldsData?.fillableFields || [];
  const fieldsMetadata = getFieldsMetadata(fillableFields);

  // Debug logging
  useEffect(() => {
    if (fillableFields.length > 0) {
      console.log('[AddStatusDialog] fillableFields from query:', fillableFields);
      console.log('[AddStatusDialog] fieldsMetadata:', fieldsMetadata);
    }
  }, [fillableFields, fieldsMetadata]);

  // Query current active status for this individual process
  const activeStatus = useQuery(
    api.individualProcessStatuses.getActiveStatus,
    { individualProcessId }
  );

  // Query the current case status details to get orderNumber
  const currentCaseStatus = useQuery(
    api.caseStatuses.get,
    activeStatus?.caseStatusId ? { id: activeStatus.caseStatusId } : "skip"
  );

  // Query the next suggested status based on current orderNumber
  const suggestedNextStatus = useQuery(
    api.caseStatuses.getNextStatusByOrderNumber,
    currentCaseStatus?.orderNumber !== undefined
      ? { currentOrderNumber: currentCaseStatus.orderNumber }
      : "skip"
  );

  // Auto-select suggested status when dialog opens
  useEffect(() => {
    if (open && suggestedNextStatus) {
      setSelectedStatusId(suggestedNextStatus._id);
    }
  }, [open, suggestedNextStatus]);

  // Reset form data when status changes or dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({});
    }
  }, [open]);

  // Clear form data when status changes
  useEffect(() => {
    setFormData({});
  }, [selectedStatusId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent form

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
      // Filter out empty values from form data
      const filteredFormData: Record<string, any> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== "" && value !== null && value !== undefined) {
          filteredFormData[key] = value;
        }
      }

      await addStatus({
        individualProcessId,
        caseStatusId: selectedStatusId as Id<"caseStatuses">,
        date: date || undefined,
        notes: notes || undefined,
        filledFieldsData: Object.keys(filteredFormData).length > 0 ? filteredFormData : undefined,
      });

      toast.success(t("statusAdded"));
      onOpenChange(false);

      // Reset form
      setSelectedStatusId("");
      setDate(new Date().toISOString().split('T')[0]);
      setNotes("");
      setFormData({});
    } catch (error) {
      console.error("Error adding status:", error);
      toast.error(tCommon("error"));
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
      <DialogContent
        className="sm:max-w-[500px]"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(false);
        }}
      >
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("addStatus")}</DialogTitle>
            <DialogDescription>
              {t("addStatusDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Current Status and Suggestion Info */}
            {currentCaseStatus && suggestedNextStatus && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{t("currentStatus")}:</span>
                  <span>{currentCaseStatus.name}</span>
                  {currentCaseStatus.orderNumber && (
                    <Badge variant="outline" className="text-xs">
                      #{currentCaseStatus.orderNumber}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                  <span>{t("basedOnCurrentStatus")}</span>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="status">{t("status")}</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between"
                  >
                    {selectedStatusId ? (
                      <div className="flex items-center gap-2">
                        <span>
                          {caseStatuses?.find((status) => status._id === selectedStatusId)?.name}
                        </span>
                        {caseStatuses?.find((status) => status._id === selectedStatusId)?.orderNumber && (
                          <Badge variant="outline" className="text-xs">
                            #{caseStatuses.find((status) => status._id === selectedStatusId)?.orderNumber}
                          </Badge>
                        )}
                        {suggestedNextStatus?._id === selectedStatusId && (
                          <Badge variant="secondary" className="text-xs">
                            {t("suggestedStatus")}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{t("selectStatus")}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("searchStatus")} />
                    <CommandList>
                      <CommandEmpty>{t("noStatusFound")}</CommandEmpty>
                      <CommandGroup>
                        {caseStatuses?.map((status) => {
                          const isSuggested = suggestedNextStatus?._id === status._id;
                          return (
                            <CommandItem
                              key={status._id}
                              value={`${status.name} ${status.orderNumber || ""}`}
                              onSelect={() => {
                                setSelectedStatusId(status._id);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedStatusId === status._id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-2">
                                <span>{status.name}</span>
                                {status.orderNumber && (
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
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">{t("statusDate")}</Label>
              <DatePicker
                value={date}
                onChange={(value) => setDate(value || "")}
              />
            </div>

            {/* Dynamic Fields Section */}
            {selectedStatusId && selectedStatusId !== "" && (
              <>
                {fillableFieldsData === undefined ? (
                  // Show loading state while fetching fillable fields
                  <DynamicFieldRenderer
                    fieldsMetadata={[]}
                    formData={formData}
                    onFieldChange={handleFieldChange}
                    isLoading={true}
                  />
                ) : fieldsMetadata.length > 0 ? (
                  // Show dynamic fields if available
                  <DynamicFieldRenderer
                    fieldsMetadata={fieldsMetadata}
                    formData={formData}
                    onFieldChange={handleFieldChange}
                    isLoading={false}
                  />
                ) : null}
              </>
            )}

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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenChange(false);
              }}
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
