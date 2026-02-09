"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit, AlertCircle, ChevronsUpDown } from "lucide-react";
import {
  DocumentTypeConditionFormDialog,
  type CreatedConditionData,
} from "@/components/document-type-conditions/document-type-condition-form-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Type for a condition that's displayed in the list
interface DisplayCondition {
  _id: Id<"documentTypeConditions">;
  name: string;
  code?: string;
  description?: string;
  isRequired: boolean;
  relativeExpirationDays?: number;
  isActive: boolean;
  sortOrder?: number;
  isPending?: boolean; // True if this was added locally but not saved yet
}

// Methods exposed to parent via ref
export interface ConditionsSectionRef {
  hasChanges: () => boolean;
  applyChanges: () => Promise<void>;
  resetChanges: () => void;
}

interface ConditionsSectionProps {
  documentTypeId: Id<"documentTypes">;
}

export const ConditionsSection = forwardRef<ConditionsSectionRef, ConditionsSectionProps>(
  function ConditionsSection({ documentTypeId }, ref) {
    const t = useTranslations("DocumentTypeConditions");
    const tCommon = useTranslations("Common");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingConditionId, setEditingConditionId] = useState<Id<"documentTypeConditions"> | undefined>();
    const [selectedConditionId, setSelectedConditionId] = useState<Id<"documentTypeConditions"> | null>(null);
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [prefilledName, setPrefilledName] = useState("");

    // Local state for pending changes (not yet persisted)
    const [pendingLinks, setPendingLinks] = useState<Map<Id<"documentTypeConditions">, DisplayCondition>>(new Map());
    const [pendingUnlinks, setPendingUnlinks] = useState<Set<Id<"documentTypeConditions">>>(new Set());

    // Query conditions already linked to this document type (from server)
    const serverLinkedConditions = useQuery(
      api.documentTypeConditions.listByDocumentType,
      { documentTypeId }
    );

    // Query all available conditions (not yet linked)
    const allAvailableConditions = useQuery(
      api.documentTypeConditions.listAvailableForDocumentType,
      { documentTypeId }
    );

    const linkCondition = useMutation(api.documentTypeConditionLinks.link);
    const unlinkCondition = useMutation(api.documentTypeConditionLinks.unlink);

    // Compute the display list: server conditions - pending unlinks + pending links
    const displayConditions: DisplayCondition[] = (() => {
      if (!serverLinkedConditions) return [];

      // Track IDs already included to avoid duplicates
      const includedIds = new Set<Id<"documentTypeConditions">>();

      // Start with server conditions that are not pending unlink
      const conditions: DisplayCondition[] = serverLinkedConditions
        .filter(c => !pendingUnlinks.has(c._id))
        .map(c => {
          includedIds.add(c._id);
          return { ...c, isPending: false };
        });

      // Add pending links (only if not already in server conditions)
      pendingLinks.forEach(condition => {
        if (!includedIds.has(condition._id)) {
          conditions.push({ ...condition, isPending: true });
        }
      });

      // Sort by sortOrder then name
      return conditions.sort((a, b) => {
        const orderA = a.sortOrder ?? 999;
        const orderB = b.sortOrder ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
    })();

    // Available conditions = all available - conditions already displayed + conditions pending unlink
    const availableConditions = (() => {
      if (!allAvailableConditions || !serverLinkedConditions) return [];

      // Get IDs of all currently displayed conditions
      const displayedIds = new Set(displayConditions.map(c => c._id));

      // Start with conditions from API (not linked in DB) that aren't displayed
      const available = allAvailableConditions.filter(c => !displayedIds.has(c._id));

      // Add back conditions that are pending unlink (they were removed from display but still in DB)
      // These need to appear in dropdown so user can re-add them
      const unlinkedConditions = serverLinkedConditions
        .filter(c => pendingUnlinks.has(c._id))
        .map(c => ({
          _id: c._id,
          name: c.name,
          code: c.code,
          description: c.description,
          isRequired: c.isRequired,
          relativeExpirationDays: c.relativeExpirationDays,
          isActive: c.isActive,
          sortOrder: c.sortOrder,
        }));

      return [...available, ...unlinkedConditions];
    })();

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      hasChanges: () => pendingLinks.size > 0 || pendingUnlinks.size > 0,
      applyChanges: async () => {
        const errors: string[] = [];

        // Apply unlinks
        for (const conditionId of pendingUnlinks) {
          try {
            await unlinkCondition({ documentTypeId, documentTypeConditionId: conditionId });
          } catch (error) {
            errors.push(`Erro ao desvincular: ${error}`);
          }
        }

        // Apply links
        for (const condition of pendingLinks.values()) {
          try {
            await linkCondition({
              documentTypeId,
              documentTypeConditionId: condition._id,
              isRequired: condition.isRequired,
              sortOrder: condition.sortOrder,
            });
          } catch (error) {
            errors.push(`Erro ao vincular ${condition.name}: ${error}`);
          }
        }

        if (errors.length > 0) {
          throw new Error(errors.join("\n"));
        }

        // Clear pending state
        setPendingLinks(new Map());
        setPendingUnlinks(new Set());
      },
      resetChanges: () => {
        setPendingLinks(new Map());
        setPendingUnlinks(new Set());
      },
    }), [pendingLinks, pendingUnlinks, documentTypeId, linkCondition, unlinkCondition]);

    // Reset pending state when documentTypeId changes
    useEffect(() => {
      setPendingLinks(new Map());
      setPendingUnlinks(new Set());
    }, [documentTypeId]);

    const handleSelectCondition = (conditionId: Id<"documentTypeConditions">) => {
      setSelectedConditionId(conditionId);
      setComboboxOpen(false);
      setSearchValue("");
    };

    const handleAddCondition = () => {
      if (!selectedConditionId) return;

      // Find the condition details from available conditions
      const condition = availableConditions.find(c => c._id === selectedConditionId);
      if (!condition) return;

      // Check if it was previously unlinked (in pendingUnlinks)
      if (pendingUnlinks.has(selectedConditionId)) {
        // Remove from pendingUnlinks instead of adding to pendingLinks
        setPendingUnlinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedConditionId);
          return newSet;
        });
      } else {
        // Add to pendingLinks
        setPendingLinks(prev => {
          const newMap = new Map(prev);
          newMap.set(selectedConditionId, {
            _id: condition._id,
            name: condition.name,
            code: condition.code,
            description: condition.description,
            isRequired: condition.isRequired,
            relativeExpirationDays: condition.relativeExpirationDays,
            isActive: condition.isActive,
            sortOrder: condition.sortOrder,
          });
          return newMap;
        });
      }

      setSelectedConditionId(null);
    };

    const handleCreateNew = () => {
      setPrefilledName(searchValue);
      setEditingConditionId(undefined);
      setIsFormOpen(true);
      setComboboxOpen(false);
      setSearchValue("");
    };

    const handleEditCondition = (conditionId: Id<"documentTypeConditions">) => {
      setPrefilledName("");
      setEditingConditionId(conditionId);
      setIsFormOpen(true);
    };

    const handleRemoveCondition = (conditionId: Id<"documentTypeConditions">) => {
      // Check if this is a pending link (not yet saved)
      if (pendingLinks.has(conditionId)) {
        // Just remove from pending links
        setPendingLinks(prev => {
          const newMap = new Map(prev);
          newMap.delete(conditionId);
          return newMap;
        });
      } else {
        // Add to pending unlinks
        setPendingUnlinks(prev => {
          const newSet = new Set(prev);
          newSet.add(conditionId);
          return newSet;
        });
      }
    };

    const handleFormSuccess = (createdCondition?: CreatedConditionData) => {
      setPrefilledName("");
      setSelectedConditionId(null);

      // If a new condition was created, add it to pending links
      if (createdCondition) {
        setPendingLinks(prev => {
          const newMap = new Map(prev);
          newMap.set(createdCondition._id, {
            _id: createdCondition._id,
            name: createdCondition.name,
            code: createdCondition.code,
            description: createdCondition.description,
            isRequired: createdCondition.isRequired,
            relativeExpirationDays: createdCondition.relativeExpirationDays,
            isActive: createdCondition.isActive,
            sortOrder: createdCondition.sortOrder,
          });
          return newMap;
        });
      }
    };

    // Find the selected condition's name for display
    const selectedCondition = availableConditions.find(c => c._id === selectedConditionId);

    if (serverLinkedConditions === undefined || allAvailableConditions === undefined) {
      return (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <Card>
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base">{t("conditions")}</CardTitle>
              <CardDescription>{t("conditionsDescription")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Combobox + Add Button Row */}
            <div className="flex gap-2">
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="flex-1 justify-between"
                  >
                    {selectedCondition
                      ? selectedCondition.name
                      : t("selectConditionPlaceholder")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder={t("searchConditionPlaceholder")}
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <span className="text-muted-foreground">{t("noAvailableConditions")}</span>
                      </CommandEmpty>
                      {availableConditions.length > 0 && (
                        <CommandGroup heading={t("availableConditions")}>
                          {availableConditions.map((condition) => (
                            <CommandItem
                              key={condition._id}
                              value={condition.name}
                              onSelect={() => handleSelectCondition(condition._id)}
                            >
                              <div className="flex flex-col">
                                <span>{condition.name}</span>
                                {condition.code && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {condition.code}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {searchValue && (
                        <>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem onSelect={handleCreateNew}>
                              <Plus className="mr-2 h-4 w-4" />
                              {t("createNew")} &quot;{searchValue}&quot;
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )}
                      {!searchValue && availableConditions.length === 0 && (
                        <CommandGroup>
                          <CommandItem onSelect={() => {
                            setPrefilledName("");
                            setEditingConditionId(undefined);
                            setIsFormOpen(true);
                            setComboboxOpen(false);
                          }}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("createNewCondition")}
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                onClick={handleAddCondition}
                disabled={!selectedConditionId}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("addButton")}
              </Button>
            </div>

            {/* Linked Conditions List */}
            {displayConditions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>{t("noConditionsForType")}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {displayConditions.map((condition) => (
                  <div
                    key={condition._id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50",
                      condition.isPending && "border-dashed border-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{condition.name}</span>
                        {condition.code && (
                          <span className="text-xs font-mono text-muted-foreground">
                            ({condition.code})
                          </span>
                        )}
                        {condition.isPending && (
                          <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                            {tCommon("new")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={condition.isRequired ? "default" : "secondary"} className="text-xs">
                          {condition.isRequired ? t("required") : t("optional")}
                        </Badge>
                        {condition.relativeExpirationDays && (
                          <Badge variant="outline" className="text-xs">
                            {condition.relativeExpirationDays} {t("days")}
                          </Badge>
                        )}
                        {!condition.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            {tCommon("inactive")}
                          </Badge>
                        )}
                      </div>
                      {condition.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {condition.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditCondition(condition._id)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">{tCommon("edit")}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveCondition(condition._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t("remove")}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <DocumentTypeConditionFormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingConditionId(undefined);
              setPrefilledName("");
            }
          }}
          conditionId={editingConditionId}
          documentTypeId={documentTypeId}
          prefilledName={prefilledName}
          onSuccess={handleFormSuccess}
        />
      </>
    );
  }
);
