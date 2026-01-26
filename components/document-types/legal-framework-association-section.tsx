"use client";

import { useState, useMemo, useEffect, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CheckCheck, X, AlertCircle, Search, ChevronRight } from "lucide-react";
import { fuzzyMatch } from "@/lib/fuzzy-search";
import { AuthorizationTypeQuickSelector } from "./authorization-type-quick-selector";
import { cn } from "@/lib/utils";

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

// Type for legal framework with process types from the query
interface LegalFrameworkWithProcessTypes {
  _id: string;
  _creationTime: number;
  name: string;
  description?: string;
  isActive?: boolean;
  processTypes: Array<{
    _id: string;
    name: string;
    description?: string;
    estimatedDays?: number;
    isActive?: boolean;
    sortOrder?: number;
  }>;
}

// Type for grouped legal frameworks
interface GroupedLegalFrameworks {
  processTypeId: string;
  processTypeName: string;
  legalFrameworks: LegalFrameworkWithProcessTypes[];
}

export function LegalFrameworkAssociationSection({
  value,
  onChange,
}: LegalFrameworkAssociationSectionProps) {
  const t = useTranslations("DocumentTypes");
  const [searchFilter, setSearchFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["__ungrouped__"])
  );

  // Fetch all active legal frameworks with their process types
  const legalFrameworks = useQuery(api.legalFrameworks.list, {
    isActive: true,
  }) as LegalFrameworkWithProcessTypes[] | undefined;

  // Filter legal frameworks based on search (consecutive match, accent-insensitive)
  const filteredLegalFrameworks = useMemo(() => {
    if (!legalFrameworks) return [];
    if (!searchFilter.trim()) return legalFrameworks;

    return legalFrameworks.filter((lf) => {
      const match = fuzzyMatch(lf.name, searchFilter);
      return match !== null;
    });
  }, [legalFrameworks, searchFilter]);

  // Group legal frameworks by authorization type
  const groupedLegalFrameworks = useMemo(() => {
    if (!filteredLegalFrameworks.length) return [];

    const groups: Map<string, GroupedLegalFrameworks> = new Map();
    const ungrouped: LegalFrameworkWithProcessTypes[] = [];

    for (const lf of filteredLegalFrameworks) {
      if (!lf.processTypes || lf.processTypes.length === 0) {
        ungrouped.push(lf);
      } else {
        // Add to each process type group it belongs to
        for (const pt of lf.processTypes) {
          const existing = groups.get(pt._id);
          if (existing) {
            existing.legalFrameworks.push(lf);
          } else {
            groups.set(pt._id, {
              processTypeId: pt._id,
              processTypeName: pt.name,
              legalFrameworks: [lf],
            });
          }
        }
      }
    }

    // Sort groups by name and add ungrouped at the end
    const sortedGroups = Array.from(groups.values()).sort((a, b) =>
      a.processTypeName.localeCompare(b.processTypeName)
    );

    if (ungrouped.length > 0) {
      sortedGroups.push({
        processTypeId: "__ungrouped__",
        processTypeName: t("ungroupedLegalFrameworks"),
        legalFrameworks: ungrouped,
      });
    }

    return sortedGroups;
  }, [filteredLegalFrameworks, t]);

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Expand all groups when search is active
  useEffect(() => {
    if (searchFilter.trim()) {
      setExpandedGroups(
        new Set(groupedLegalFrameworks.map((g) => g.processTypeId))
      );
    }
  }, [searchFilter, groupedLegalFrameworks]);

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
        a.legalFrameworkId === lfId ? { ...a, isRequired: !a.isRequired } : a
      )
    );
  };

  // Check if all legal frameworks in a group are selected
  const isGroupFullySelected = (group: GroupedLegalFrameworks) => {
    return group.legalFrameworks.every((lf) => isSelected(lf._id));
  };

  // Check if some (but not all) legal frameworks in a group are selected
  const isGroupPartiallySelected = (group: GroupedLegalFrameworks) => {
    const selectedCount = group.legalFrameworks.filter((lf) =>
      isSelected(lf._id)
    ).length;
    return selectedCount > 0 && selectedCount < group.legalFrameworks.length;
  };

  // Toggle selection of all legal frameworks in a group
  const toggleGroupSelection = (group: GroupedLegalFrameworks) => {
    const allSelected = isGroupFullySelected(group);

    if (allSelected) {
      // Deselect all in this group
      const groupIds = new Set(group.legalFrameworks.map((lf) => lf._id));
      onChange(value.filter((a) => !groupIds.has(a.legalFrameworkId)));
    } else {
      // Select all in this group
      const existingIds = new Set(value.map((v) => v.legalFrameworkId));
      const newAssociations = group.legalFrameworks
        .filter((lf) => !existingIds.has(lf._id))
        .map((lf) => ({ legalFrameworkId: lf._id, isRequired: false }));

      onChange([...value, ...newAssociations]);
    }
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

      <ScrollArea className="h-[300px] rounded-md border p-4 overflow-x-hidden">
        <div className="space-y-2 overflow-hidden">
          {groupedLegalFrameworks.length === 0 && searchFilter.trim() && (
            <div className="text-center text-sm text-muted-foreground py-4">
              {t("noLegalFrameworksFound")}
            </div>
          )}
          {groupedLegalFrameworks.map((group) => {
            const isExpanded = expandedGroups.has(group.processTypeId);
            const groupFullySelected = isGroupFullySelected(group);
            const groupPartiallySelected = isGroupPartiallySelected(group);

            return (
              <Collapsible
                key={group.processTypeId}
                open={isExpanded}
                onOpenChange={() => toggleGroupExpansion(group.processTypeId)}
                className="border rounded-lg"
              >
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-t-lg">
                  <Checkbox
                    id={`group-${group.processTypeId}`}
                    checked={
                      groupFullySelected
                        ? true
                        : groupPartiallySelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={() => toggleGroupSelection(group)}
                  />
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 flex-1 text-left hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                    >
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                      <span className="font-medium text-sm">
                        {group.processTypeName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({group.legalFrameworks.length})
                      </span>
                    </button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent>
                  <div className="px-3 py-2 space-y-1">
                    {group.legalFrameworks.map((lf) => (
                      <div
                        key={lf._id}
                        className="flex items-start justify-between gap-4 py-2 px-2 hover:bg-muted/50 rounded-md transition-colors"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Checkbox
                            id={`lf-${group.processTypeId}-${lf._id}`}
                            checked={isSelected(lf._id)}
                            onCheckedChange={() => toggleSelection(lf._id)}
                            className="mt-0.5"
                          />
                          <Label
                            htmlFor={`lf-${group.processTypeId}-${lf._id}`}
                            className="cursor-pointer flex-1 text-sm leading-relaxed break-words"
                          >
                            {highlightText(lf.name, searchFilter)}
                          </Label>
                        </div>

                        {isSelected(lf._id) && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Checkbox
                              id={`lf-required-${group.processTypeId}-${lf._id}`}
                              checked={isRequiredLf(lf._id)}
                              onCheckedChange={() => toggleRequired(lf._id)}
                            />
                            <Label
                              htmlFor={`lf-required-${group.processTypeId}-${lf._id}`}
                              className="cursor-pointer text-sm text-muted-foreground whitespace-nowrap"
                            >
                              {t("required")}
                            </Label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
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
