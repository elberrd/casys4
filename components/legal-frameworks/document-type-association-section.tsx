"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslations } from "next-intl";
import { cn, normalizeString } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCheck, ChevronsUpDown, X, AlertCircle, Plus, FileText, Info } from "lucide-react";

// Internal type that accepts string IDs from the form
interface FormAssociation {
  documentTypeId: string;
  isRequired: boolean;
  validityType?: "min_remaining" | "max_age";
  validityDays?: number;
}

interface DocumentTypeAssociationSectionProps {
  value: FormAssociation[];
  onChange: (associations: FormAssociation[]) => void;
  pendingDocTypeId?: string | null;
  onPendingDocTypeHandled?: () => void;
  onRequestCreateNew?: () => void;
}

export function DocumentTypeAssociationSection({
  value,
  onChange,
  pendingDocTypeId,
  onPendingDocTypeHandled,
  onRequestCreateNew,
}: DocumentTypeAssociationSectionProps) {
  const t = useTranslations("LegalFrameworks");
  const tCommon = useTranslations("Common");

  const [documentTypeSelectorOpen, setDocumentTypeSelectorOpen] = useState(false);

  // Fetch all active document types
  const documentTypes = useQuery(api.documentTypes.list, { isActive: true });
  const allDocumentTypes = useMemo(() => documentTypes ?? [], [documentTypes]);

  // Auto-select newly created document type once it appears in the query results
  useEffect(() => {
    if (pendingDocTypeId && documentTypes) {
      const exists = documentTypes.some((dt) => dt._id === pendingDocTypeId);
      if (exists) {
        const alreadySelected = value.some((a) => a.documentTypeId === pendingDocTypeId);
        if (!alreadySelected) {
          onChange([...value, { documentTypeId: pendingDocTypeId, isRequired: false }]);
        }
        onPendingDocTypeHandled?.();
      }
    }
  }, [pendingDocTypeId, documentTypes, value, onChange, onPendingDocTypeHandled]);

  // Helper to check if a document type is selected
  const isSelected = (dtId: string) => {
    return value.some((a) => a.documentTypeId === dtId);
  };

  // Helper to check if a document type is required
  const isRequiredDt = (dtId: string) => {
    const assoc = value.find((a) => a.documentTypeId === dtId);
    return assoc?.isRequired ?? false;
  };

  // Validity helpers
  const getValidityType = (dtId: string) => {
    const assoc = value.find((a) => a.documentTypeId === dtId);
    return assoc?.validityType ?? "";
  };

  const getValidityDays = (dtId: string) => {
    const assoc = value.find((a) => a.documentTypeId === dtId);
    return assoc?.validityDays ?? undefined;
  };

  const selectedDocumentTypes = useMemo(() => {
    const documentTypeMap = new Map(allDocumentTypes.map((dt) => [dt._id as string, dt]));
    return value
      .map((association) => documentTypeMap.get(association.documentTypeId))
      .filter((dt): dt is (typeof allDocumentTypes)[number] => Boolean(dt));
  }, [allDocumentTypes, value]);

  const selectedDocumentTypeIdSet = useMemo(
    () => new Set(value.map((association) => association.documentTypeId)),
    [value]
  );

  const availableDocumentTypes = useMemo(
    () => allDocumentTypes.filter((dt) => !selectedDocumentTypeIdSet.has(dt._id)),
    [allDocumentTypes, selectedDocumentTypeIdSet]
  );

  const updateValidityType = (dtId: string, vt: string) => {
    onChange(
      value.map((a) =>
        a.documentTypeId === dtId
          ? { ...a, validityType: (vt || undefined) as FormAssociation["validityType"], validityDays: vt ? a.validityDays : undefined }
          : a
      )
    );
  };

  const updateValidityDays = (dtId: string, days: number | undefined) => {
    onChange(
      value.map((a) =>
        a.documentTypeId === dtId
          ? { ...a, validityDays: days }
          : a
      )
    );
  };

  const toggleDocumentTypeSelection = (dtId: string) => {
    if (isSelected(dtId)) {
      onChange(value.filter((association) => association.documentTypeId !== dtId));
      return;
    }

    onChange([...value, { documentTypeId: dtId, isRequired: false }]);
  };

  // Toggle required status for a document type
  const toggleRequired = (dtId: string) => {
    onChange(
      value.map((a) =>
        a.documentTypeId === dtId
          ? { ...a, isRequired: !a.isRequired }
          : a
      )
    );
  };

  const removeSelection = (dtId: string) => {
    onChange(value.filter((association) => association.documentTypeId !== dtId));
  };

  // Select all document types
  const selectAll = () => {
    onChange(
      allDocumentTypes.map((dt) => ({
        documentTypeId: dt._id as string,
        isRequired: isRequiredDt(dt._id), // Preserve existing isRequired values
      }))
    );
  };

  // Deselect all document types
  const deselectAll = () => {
    onChange([]);
  };

  const allSelected = allDocumentTypes.length > 0 && allDocumentTypes.every((dt) => isSelected(dt._id));
  const noneSelected = value.length === 0;

  if (!documentTypes) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("documentTypeAssociations")}
        </Label>
        <div className="flex gap-2 flex-wrap">
          {onRequestCreateNew && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRequestCreateNew}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("addDocumentType")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={allSelected || allDocumentTypes.length === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {t("selectAll")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={deselectAll}
            disabled={noneSelected}
          >
            <X className="mr-2 h-4 w-4" />
            {t("deselectAll")}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("documentTypeAssociationsDescription")}
      </p>

      <Popover open={documentTypeSelectorOpen} onOpenChange={setDocumentTypeSelectorOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={documentTypeSelectorOpen}
            className={cn(
              "w-full h-auto min-h-10 justify-between items-start gap-2 px-3 py-2",
              selectedDocumentTypes.length === 0 && "text-muted-foreground",
            )}
          >
            <div className="flex-1 min-w-0 text-left">
              {value.length === 0 ? (
                <span>{t("selectDocumentTypes")}</span>
              ) : (
                <span>{t("selectedCount", { count: value.length })}</span>
              )}
            </div>
            <ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <Command
            filter={(itemValue, search) => {
              const searchNormalized = normalizeString(search);
              if (!searchNormalized) return 1;

              const docType = availableDocumentTypes.find((dt) => dt._id === itemValue);
              if (!docType) return 0;

              const labelNormalized = normalizeString(`${docType.name} ${docType.code ?? ""}`);
              return labelNormalized.includes(searchNormalized) ? 1 : 0;
            }}
          >
            <CommandInput placeholder={t("filterDocumentTypes")} />
            <CommandList
              className="max-h-[340px] overflow-y-scroll overscroll-contain [scrollbar-gutter:stable]"
              onWheelCapture={(event) => {
                event.stopPropagation();
              }}
            >
              <CommandEmpty>{t("noDocumentTypesFound")}</CommandEmpty>
              <CommandGroup>
                {availableDocumentTypes.map((dt) => (
                  <CommandItem
                    key={dt._id}
                    value={dt._id}
                    onSelect={() => toggleDocumentTypeSelection(dt._id)}
                    className="items-start gap-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug whitespace-normal break-words">
                        {dt.name}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {allDocumentTypes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>{t("noDocumentTypesAvailable")}</span>
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[360px] rounded-md border p-4">
          <div className="space-y-3">
            {selectedDocumentTypes.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                {t("noDocumentTypesSelected")}
              </div>
            )}
            {selectedDocumentTypes.map((dt) => (
              <div
                key={dt._id}
                className="py-2 px-1 hover:bg-muted/50 rounded-md transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug whitespace-normal break-words">
                        {dt.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeSelection(dt._id)}
                      aria-label={tCommon("remove")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`dt-required-${dt._id}`}
                        checked={isRequiredDt(dt._id)}
                        onCheckedChange={() => toggleRequired(dt._id)}
                      />
                      <Label
                        htmlFor={`dt-required-${dt._id}`}
                        className="cursor-pointer text-sm text-muted-foreground whitespace-nowrap"
                      >
                        {t("required")}
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Validity rule controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={getValidityType(dt._id) || "none"}
                    onValueChange={(val) => updateValidityType(dt._id, val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="h-7 text-xs w-[180px]">
                      <SelectValue placeholder={t("noValidity")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("noValidity")}</SelectItem>
                      <SelectItem value="min_remaining">{t("minRemaining")}</SelectItem>
                      <SelectItem value="max_age">{t("maxAge")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {getValidityType(dt._id) && (
                    <Input
                      type="number"
                      min={1}
                      className="h-7 text-xs w-[80px]"
                      placeholder={t("validityDays")}
                      value={getValidityDays(dt._id) ?? ""}
                      onChange={(e) => updateValidityDays(dt._id, e.target.value ? Number(e.target.value) : undefined)}
                    />
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-xs">
                      {getValidityType(dt._id) === "min_remaining"
                        ? t("minRemainingTooltip")
                        : getValidityType(dt._id) === "max_age"
                          ? t("maxAgeTooltip")
                          : t("validityTypeTooltip")}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {value.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("selectedCount", { count: value.length })} |{" "}
          {t("requiredCount", {
            count: value.filter((a) => a.isRequired).length,
          })}
        </p>
      )}
    </div>
    </TooltipProvider>
  );
}
