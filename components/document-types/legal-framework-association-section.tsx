"use client";

import { useState, useMemo, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { CheckCheck, X, AlertCircle, Search } from "lucide-react";
import { fuzzyMatch } from "@/lib/fuzzy-search";
import { AuthorizationTypeQuickSelector } from "./authorization-type-quick-selector";

// Internal type that accepts string IDs from the form
interface FormAssociation {
  legalFrameworkId: string;
  isRequired: boolean;
}

interface LegalFrameworkAssociationSectionProps {
  value: FormAssociation[];
  onChange: (associations: FormAssociation[]) => void;
}

// Highlight matched characters in text using fuzzy match result
function highlightText(text: string, searchTerm: string): ReactNode {
  if (!searchTerm || searchTerm.length === 0) {
    return text;
  }

  const match = fuzzyMatch(text, searchTerm);

  if (!match || match.matches.length === 0) {
    return text;
  }

  // Since fuzzyMatch returns consecutive indices, we can highlight the whole matched substring
  const startIndex = match.matches[0];
  const endIndex = match.matches[match.matches.length - 1] + 1;

  const before = text.substring(0, startIndex);
  const highlighted = text.substring(startIndex, endIndex);
  const after = text.substring(endIndex);

  return (
    <span>
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-900/50 font-medium rounded-sm">
        {highlighted}
      </mark>
      {after}
    </span>
  );
}

export function LegalFrameworkAssociationSection({
  value,
  onChange,
}: LegalFrameworkAssociationSectionProps) {
  const t = useTranslations("DocumentTypes");
  const [searchFilter, setSearchFilter] = useState("");

  // Fetch all active legal frameworks
  const legalFrameworks = useQuery(api.legalFrameworks.list, { isActive: true });

  // Filter legal frameworks based on search (consecutive match, accent-insensitive)
  const filteredLegalFrameworks = useMemo(() => {
    if (!legalFrameworks) return [];
    if (!searchFilter.trim()) return legalFrameworks;

    return legalFrameworks.filter((lf) => {
      const match = fuzzyMatch(lf.name, searchFilter);
      return match !== null;
    });
  }, [legalFrameworks, searchFilter]);

  if (!legalFrameworks) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (legalFrameworks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>{t("noLegalFrameworksAvailable")}</span>
        </div>
      </div>
    );
  }

  // Helper to check if a legal framework is selected
  const isSelected = (lfId: string) => {
    return value.some((a) => a.legalFrameworkId === lfId);
  };

  // Helper to check if a legal framework is required
  const isRequiredLf = (lfId: string) => {
    const assoc = value.find((a) => a.legalFrameworkId === lfId);
    return assoc?.isRequired ?? false;
  };

  // Toggle selection of a legal framework
  const toggleSelection = (lfId: string) => {
    if (isSelected(lfId)) {
      onChange(value.filter((a) => a.legalFrameworkId !== lfId));
    } else {
      onChange([...value, { legalFrameworkId: lfId, isRequired: false }]);
    }
  };

  // Toggle required status for a legal framework
  const toggleRequired = (lfId: string) => {
    onChange(
      value.map((a) =>
        a.legalFrameworkId === lfId
          ? { ...a, isRequired: !a.isRequired }
          : a
      )
    );
  };

  // Select all legal frameworks
  const selectAll = () => {
    onChange(
      legalFrameworks.map((lf) => ({
        legalFrameworkId: lf._id as string,
        isRequired: isRequiredLf(lf._id), // Preserve existing isRequired values
      }))
    );
  };

  // Deselect all legal frameworks
  const deselectAll = () => {
    onChange([]);
  };

  // Handle selection from authorization type quick selector
  const handleApplyAuthorizationTypeSelection = (legalFrameworkIds: string[]) => {
    const currentIds = new Set(value.map((v) => v.legalFrameworkId));
    const newAssociations = legalFrameworkIds
      .filter((id) => !currentIds.has(id))
      .map((id) => ({ legalFrameworkId: id, isRequired: false }));

    onChange([...value, ...newAssociations]);
  };

  const allSelected = legalFrameworks.every((lf) => isSelected(lf._id));
  const noneSelected = value.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">
          {t("legalFrameworkAssociations")}
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={allSelected}
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
        {t("legalFrameworkAssociationsDescription")}
      </p>

      {/* Authorization Type Quick Selector */}
      <AuthorizationTypeQuickSelector
        onApplySelection={handleApplyAuthorizationTypeSelection}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("filterLegalFrameworks")}
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[200px] rounded-md border p-4">
        <div className="space-y-3">
          {filteredLegalFrameworks.length === 0 && searchFilter.trim() && (
            <div className="text-center text-sm text-muted-foreground py-4">
              {t("noLegalFrameworksFound")}
            </div>
          )}
          {filteredLegalFrameworks.map((lf) => (
            <div
              key={lf._id}
              className="flex items-center justify-between gap-4 py-2 px-1 hover:bg-muted/50 rounded-md transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Checkbox
                  id={`lf-${lf._id}`}
                  checked={isSelected(lf._id)}
                  onCheckedChange={() => toggleSelection(lf._id)}
                />
                <Label
                  htmlFor={`lf-${lf._id}`}
                  className="cursor-pointer truncate flex-1"
                >
                  {highlightText(lf.name, searchFilter)}
                </Label>
              </div>

              {isSelected(lf._id) && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`lf-required-${lf._id}`}
                    checked={isRequiredLf(lf._id)}
                    onCheckedChange={() => toggleRequired(lf._id)}
                  />
                  <Label
                    htmlFor={`lf-required-${lf._id}`}
                    className="cursor-pointer text-sm text-muted-foreground whitespace-nowrap"
                  >
                    {t("required")}
                  </Label>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {value.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("selectedCount", { count: value.length })} |{" "}
          {t("requiredCount", {
            count: value.filter((a) => a.isRequired).length,
          })}
        </p>
      )}
    </div>
  );
}
