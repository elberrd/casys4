"use client"

import { useState } from "react"
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
import { toast } from "sonner"

interface SaveFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filterType: "individualProcesses" | "collectiveProcesses"
  currentFilters: any
  onSaveSuccess?: () => void
}

export function SaveFilterSheet({
  open,
  onOpenChange,
  filterType,
  currentFilters,
  onSaveSuccess,
}: SaveFilterSheetProps) {
  const t = useTranslations("SavedFilters")
  const tCommon = useTranslations("Common")
  const [filterName, setFilterName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const createMutation = useMutation(api.savedFilters.create)

  const getFilterSummary = () => {
    const summary: Array<{ key: string; label: string }> = []

    if (filterType === "individualProcesses") {
      if (currentFilters.selectedCandidates?.length > 0) {
        summary.push({
          key: "candidates",
          label: t("filterSummary.candidates", { count: currentFilters.selectedCandidates.length }),
        })
      }
      if (currentFilters.selectedApplicants?.length > 0) {
        summary.push({
          key: "applicants",
          label: t("filterSummary.applicants", { count: currentFilters.selectedApplicants.length }),
        })
      }
      if (currentFilters.selectedProgressStatuses?.length > 0) {
        summary.push({
          key: "statuses",
          label: t("filterSummary.progressStatuses", { count: currentFilters.selectedProgressStatuses.length }),
        })
      }
      if (currentFilters.isRnmModeActive) {
        summary.push({
          key: "rnm",
          label: t("filterSummary.rnmMode"),
        })
      }
      if (currentFilters.isUrgentModeActive) {
        summary.push({
          key: "urgent",
          label: t("filterSummary.urgentMode"),
        })
      }
      if (currentFilters.isQualExpProfModeActive) {
        summary.push({
          key: "qual",
          label: t("filterSummary.qualExpProfMode"),
        })
      }
      if (currentFilters.advancedFilters?.length > 0) {
        summary.push({
          key: "advancedFilters",
          label: t("filterSummary.advancedFilters", { count: currentFilters.advancedFilters.length }),
        })
      }
    } else if (filterType === "collectiveProcesses") {
      if (currentFilters.selectedProcessTypes?.length > 0) {
        summary.push({
          key: "processTypes",
          label: t("filterSummary.processTypes", { count: currentFilters.selectedProcessTypes.length }),
        })
      }
    }

    return summary
  }

  const handleSave = async () => {
    if (!filterName.trim()) {
      toast.error(t("errors.nameRequired"))
      return
    }

    setIsSaving(true)

    try {
      await createMutation({
        name: filterName.trim(),
        filterType,
        filterCriteria: currentFilters,
      })

      toast.success(t("success.filterSaved"))
      setFilterName("")
      onSaveSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save filter:", error)
      toast.error(t("errors.saveFailed"))
    } finally {
      setIsSaving(false)
    }
  }

  const filterSummary = getFilterSummary()
  const remainingChars = 100 - filterName.length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("saveFilter")}</SheetTitle>
          <SheetDescription>{t("saveFilterDescription")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-4">
          {/* Active Filters Summary */}
          <div>
            <Label className="text-sm font-medium">{t("activeFilters")}</Label>
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
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("warnings.applyFiltersFirst")}</AlertTitle>
                  <AlertDescription>
                    {t("warnings.applyFiltersDescription")}
                  </AlertDescription>
                </Alert>
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
                    disabled={isSaving || !filterName.trim() || filterSummary.length === 0}
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
              {(filterSummary.length === 0 || !filterName.trim()) && !isSaving && (
                <TooltipContent>
                  <p>
                    {filterSummary.length === 0
                      ? t("errors.noFiltersActive")
                      : t("errors.nameRequired")}
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
