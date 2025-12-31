"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Save, Loader2, AlertCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"

interface SavedFilter {
  _id: Id<"savedFilters">
  name: string
  filterType: "individualProcesses" | "collectiveProcesses"
  filterCriteria: any
}

interface SaveFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filterType: "individualProcesses" | "collectiveProcesses"
  currentFilters: any
  onSaveSuccess?: () => void
  editingFilter?: SavedFilter | null
}

export function SaveFilterSheet({
  open,
  onOpenChange,
  filterType,
  currentFilters,
  onSaveSuccess,
  editingFilter,
}: SaveFilterSheetProps) {
  const t = useTranslations("SavedFilters")
  const tCommon = useTranslations("Common")
  const [filterName, setFilterName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const createMutation = useMutation(api.savedFilters.create)
  const updateMutation = useMutation(api.savedFilters.update)

  const isEditMode = !!editingFilter

  // Reset filter name when opening/closing or when editingFilter changes
  useEffect(() => {
    if (open) {
      if (editingFilter) {
        setFilterName(editingFilter.name)
      } else {
        setFilterName("")
      }
    }
  }, [open, editingFilter])

  const getFilterSummaryFromCriteria = (criteria: any) => {
    const summary: Array<{ key: string; label: string }> = []

    if (filterType === "individualProcesses") {
      if (criteria.selectedCandidates?.length > 0) {
        summary.push({
          key: "candidates",
          label: t("filterSummary.candidates", { count: criteria.selectedCandidates.length }),
        })
      }
      if (criteria.selectedApplicants?.length > 0) {
        summary.push({
          key: "applicants",
          label: t("filterSummary.applicants", { count: criteria.selectedApplicants.length }),
        })
      }
      if (criteria.selectedProgressStatuses?.length > 0) {
        summary.push({
          key: "statuses",
          label: t("filterSummary.progressStatuses", { count: criteria.selectedProgressStatuses.length }),
        })
      }
      if (criteria.isRnmModeActive) {
        summary.push({
          key: "rnm",
          label: t("filterSummary.rnmMode"),
        })
      }
      if (criteria.isUrgentModeActive) {
        summary.push({
          key: "urgent",
          label: t("filterSummary.urgentMode"),
        })
      }
      if (criteria.isQualExpProfModeActive) {
        summary.push({
          key: "qual",
          label: t("filterSummary.qualExpProfMode"),
        })
      }
      if (criteria.advancedFilters?.length > 0) {
        summary.push({
          key: "advancedFilters",
          label: t("filterSummary.advancedFilters", { count: criteria.advancedFilters.length }),
        })
      }
    } else if (filterType === "collectiveProcesses") {
      if (criteria.selectedProcessTypes?.length > 0) {
        summary.push({
          key: "processTypes",
          label: t("filterSummary.processTypes", { count: criteria.selectedProcessTypes.length }),
        })
      }
    }

    return summary
  }

  const filterSummary = isEditMode
    ? getFilterSummaryFromCriteria(editingFilter.filterCriteria)
    : getFilterSummaryFromCriteria(currentFilters)

  const handleSave = async () => {
    if (!filterName.trim()) {
      toast.error(t("errors.nameRequired"))
      return
    }

    setIsSaving(true)

    try {
      if (isEditMode) {
        await updateMutation({
          id: editingFilter._id,
          name: filterName.trim(),
        })
        toast.success(t("success.filterUpdated"))
      } else {
        await createMutation({
          name: filterName.trim(),
          filterType,
          filterCriteria: currentFilters,
        })
        toast.success(t("success.filterSaved"))
      }

      setFilterName("")
      onSaveSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save filter:", error)
      toast.error(isEditMode ? t("errors.updateFailed") : t("errors.saveFailed"))
    } finally {
      setIsSaving(false)
    }
  }

  const remainingChars = 100 - filterName.length
  const canSave = isEditMode
    ? filterName.trim().length > 0
    : filterName.trim().length > 0 && filterSummary.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditMode ? t("editFilter") : t("saveFilter")}</SheetTitle>
          <SheetDescription>
            {isEditMode ? t("editFilterDescription") : t("saveFilterDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-4">
          {/* Active Filters Summary */}
          <div>
            <Label className="text-sm font-medium">
              {isEditMode ? t("savedFilterCriteria") : t("activeFilters")}
            </Label>
            {filterSummary.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {filterSummary.map((item) => (
                  <Badge key={item.key} variant="secondary">
                    {item.label}
                  </Badge>
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mt-2">{t("noActiveFilters")}</p>
                {!isEditMode && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t("warnings.applyFiltersFirst")}</AlertTitle>
                    <AlertDescription>
                      {t("warnings.applyFiltersDescription")}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          {/* Filter Name Input */}
          <div className="space-y-2">
            <Label htmlFor="filter-name">{t("filterName")}</Label>
            <Input
              id="filter-name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder={t("filterNamePlaceholder")}
              maxLength={100}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              {remainingChars} {remainingChars === 1 ? "character" : "characters"} remaining
            </p>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {tCommon("cancel")}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !canSave}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {tCommon("saving")}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {tCommon("save")}
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              {!canSave && !isSaving && (
                <TooltipContent>
                  <p>
                    {!filterName.trim()
                      ? t("errors.nameRequired")
                      : t("errors.noFiltersActive")}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
