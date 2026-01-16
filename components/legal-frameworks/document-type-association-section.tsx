"use client";

import { useState, useMemo, ReactNode, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CheckCheck, X, AlertCircle, Search, Plus, FileText } from "lucide-react";
import { fuzzyMatch } from "@/lib/fuzzy-search";
import { toast } from "sonner";

// Internal type that accepts string IDs from the form
interface FormAssociation {
  documentTypeId: string;
  isRequired: boolean;
}

interface DocumentTypeAssociationSectionProps {
  value: FormAssociation[];
  onChange: (associations: FormAssociation[]) => void;
}

/**
 * Generates a code/slug from a name string.
 * - Converts to uppercase
 * - Normalizes accented characters (é -> E, ç -> C, etc.)
 * - Replaces spaces with underscores
 * - Removes special characters (keeps only A-Z, 0-9, _)
 */
function generateCodeFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
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

export function DocumentTypeAssociationSection({
  value,
  onChange,
}: DocumentTypeAssociationSectionProps) {
  const t = useTranslations("LegalFrameworks");
  const tDocTypes = useTranslations("DocumentTypes");
  const tCommon = useTranslations("Common");
  const [searchFilter, setSearchFilter] = useState("");

  // Popover state for inline document type creation
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newDocTypeName, setNewDocTypeName] = useState("");
  const [newDocTypeDescription, setNewDocTypeDescription] = useState("");
  const [newDocTypeCategory, setNewDocTypeCategory] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDocTypeId, setPendingDocTypeId] = useState<string | null>(null);

  // Fetch all active document types
  const documentTypes = useQuery(api.documentTypes.list, { isActive: true });

  // Fetch document categories for inline creation
  const documentCategories = useQuery(api.documentCategories.listActive, {}) ?? [];

  // Mutation for creating document types
  const createDocumentType = useMutation(api.documentTypes.create);

  // Auto-select newly created document type once it appears in the query results
  useEffect(() => {
    if (pendingDocTypeId && documentTypes) {
      const exists = documentTypes.some((dt) => dt._id === pendingDocTypeId);
      if (exists) {
        // Add the newly created document type to the selection
        const alreadySelected = value.some((a) => a.documentTypeId === pendingDocTypeId);
        if (!alreadySelected) {
          onChange([...value, { documentTypeId: pendingDocTypeId, isRequired: false }]);
        }
        setPendingDocTypeId(null);
      }
    }
  }, [pendingDocTypeId, documentTypes, value, onChange]);

  // Handle inline document type creation
  const handleCreateDocumentType = async () => {
    if (!newDocTypeName.trim()) return;

    try {
      setIsCreating(true);
      const code = generateCodeFromName(newDocTypeName);
      const newId = await createDocumentType({
        name: newDocTypeName,
        code,
        category: newDocTypeCategory || undefined,
        description: newDocTypeDescription || undefined,
        isActive: true,
      });
      toast.success(tDocTypes("createdSuccess"));
      // Store the ID to be selected once the query refreshes
      setPendingDocTypeId(newId);
      // Reset form
      setNewDocTypeName("");
      setNewDocTypeDescription("");
      setNewDocTypeCategory("");
      setPopoverOpen(false);
    } catch (error) {
      console.error("Error creating document type:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("already exists")) {
        toast.error(tDocTypes("errorDuplicateCode"));
      } else {
        toast.error(tDocTypes("errorCreate"));
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Filter document types based on search (consecutive match, accent-insensitive)
  const filteredDocumentTypes = useMemo(() => {
    if (!documentTypes) return [];
    if (!searchFilter.trim()) return documentTypes;

    return documentTypes.filter((dt) => {
      const nameMatch = fuzzyMatch(dt.name, searchFilter);
      const codeMatch = dt.code ? fuzzyMatch(dt.code, searchFilter) : null;
      return nameMatch !== null || codeMatch !== null;
    });
  }, [documentTypes, searchFilter]);

  if (!documentTypes) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Helper to check if a document type is selected
  const isSelected = (dtId: string) => {
    return value.some((a) => a.documentTypeId === dtId);
  };

  // Helper to check if a document type is required
  const isRequiredDt = (dtId: string) => {
    const assoc = value.find((a) => a.documentTypeId === dtId);
    return assoc?.isRequired ?? false;
  };

  // Toggle selection of a document type
  const toggleSelection = (dtId: string) => {
    if (isSelected(dtId)) {
      onChange(value.filter((a) => a.documentTypeId !== dtId));
    } else {
      onChange([...value, { documentTypeId: dtId, isRequired: false }]);
    }
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

  // Select all document types
  const selectAll = () => {
    onChange(
      documentTypes.map((dt) => ({
        documentTypeId: dt._id as string,
        isRequired: isRequiredDt(dt._id), // Preserve existing isRequired values
      }))
    );
  };

  // Deselect all document types
  const deselectAll = () => {
    onChange([]);
  };

  const allSelected = documentTypes.length > 0 && documentTypes.every((dt) => isSelected(dt._id));
  const noneSelected = value.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("documentTypeAssociations")}
        </Label>
        <div className="flex gap-2 flex-wrap">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("addDocumentType")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">{tDocTypes("createTitle")}</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-doc-type-name">{tDocTypes("name")}</Label>
                    <Input
                      id="new-doc-type-name"
                      placeholder={tDocTypes("name")}
                      value={newDocTypeName}
                      onChange={(e) => setNewDocTypeName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-doc-type-category">{tDocTypes("category")}</Label>
                    <Select value={newDocTypeCategory} onValueChange={setNewDocTypeCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder={tDocTypes("selectCategory")} />
                      </SelectTrigger>
                      <SelectContent>
                        {documentCategories.map((category) => (
                          <SelectItem key={category._id} value={category.code}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-doc-type-description">
                      {tDocTypes("description")} <span className="text-muted-foreground text-xs">({tCommon("optional")})</span>
                    </Label>
                    <Textarea
                      id="new-doc-type-description"
                      placeholder={tDocTypes("description")}
                      value={newDocTypeDescription}
                      onChange={(e) => setNewDocTypeDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewDocTypeName("");
                      setNewDocTypeDescription("");
                      setNewDocTypeCategory("");
                      setPopoverOpen(false);
                    }}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateDocumentType}
                    disabled={isCreating || !newDocTypeName.trim()}
                  >
                    {isCreating ? tCommon("loading") : tCommon("save")}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={allSelected || documentTypes.length === 0}
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("filterDocumentTypes")}
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {documentTypes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>{t("noDocumentTypesAvailable")}</span>
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[200px] rounded-md border p-4">
          <div className="space-y-3">
            {filteredDocumentTypes.length === 0 && searchFilter.trim() && (
              <div className="text-center text-sm text-muted-foreground py-4">
                {t("noDocumentTypesFound")}
              </div>
            )}
            {filteredDocumentTypes.map((dt) => (
              <div
                key={dt._id}
                className="flex items-center justify-between gap-4 py-2 px-1 hover:bg-muted/50 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Checkbox
                    id={`dt-${dt._id}`}
                    checked={isSelected(dt._id)}
                    onCheckedChange={() => toggleSelection(dt._id)}
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`dt-${dt._id}`}
                      className="cursor-pointer truncate block"
                    >
                      {highlightText(dt.name, searchFilter)}
                    </Label>
                    {dt.code && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {highlightText(dt.code, searchFilter)}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected(dt._id) && (
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
                )}
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
  );
}
