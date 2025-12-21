"use client"

import { useState, useMemo, useCallback } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { CollectiveProcessesTable } from "@/components/collective-processes/collective-processes-table"
import { Button } from "@/components/ui/button"
import { ExportDataDialog } from "@/components/ui/export-data-dialog"
import { Plus, Filter as FilterIcon } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"
import { MultiSelect } from "@/components/ui/multi-select"
import { SaveFilterSheet } from "@/components/saved-filters/save-filter-sheet"
import { SavedFiltersList } from "@/components/saved-filters/saved-filters-list"
import { SaveFilterButton } from "@/components/saved-filters/save-filter-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

export function CollectiveProcessesClient() {
  const t = useTranslations('CollectiveProcesses')
  const tCommon = useTranslations('Common')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tSavedFilters = useTranslations('SavedFilters')
  const router = useRouter()

  const [selectedProcessTypes, setSelectedProcessTypes] = useState<Id<"processTypes">[]>([])
  const [isSaveFilterSheetOpen, setIsSaveFilterSheetOpen] = useState(false)

  const collectiveProcesses = useQuery(api.collectiveProcesses.list, {}) ?? []
  const processTypes = useQuery(api.processTypes.list, {}) ?? []

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('processManagement') },
    { label: tBreadcrumbs('collectiveProcesses') }
  ]

  // Filter collective processes by selected process types
  const filteredCollectiveProcesses = selectedProcessTypes.length > 0
    ? collectiveProcesses.filter(process =>
        process.processType && selectedProcessTypes.includes(process.processType._id)
      )
    : collectiveProcesses

  // Prepare process types options for multi-select
  const processTypeOptions = processTypes.map(type => ({
    value: type._id,
    label: type.name,
  }))

  // Saved Filters functionality
  const hasActiveFilters = useMemo(() => {
    return selectedProcessTypes.length > 0
  }, [selectedProcessTypes])

  const getCurrentFilterCriteria = useCallback(() => {
    return {
      selectedProcessTypes: selectedProcessTypes.length > 0 ? selectedProcessTypes : undefined
    }
  }, [selectedProcessTypes])

  const handleApplySavedFilter = useCallback((filterCriteria: any) => {
    // Clear filters
    setSelectedProcessTypes([])

    // Apply saved filter criteria
    if (filterCriteria.selectedProcessTypes) {
      setSelectedProcessTypes(filterCriteria.selectedProcessTypes)
    }

    toast.success(tSavedFilters("success.filterApplied"))
  }, [tSavedFilters])

  const handleView = (id: Id<"collectiveProcesses">) => {
    router.push(`/collective-processes/${id}`)
  }

  const handleEdit = (id: Id<"collectiveProcesses">) => {
    router.push(`/collective-processes/${id}/edit`)
  }

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Saved Filters Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  {tSavedFilters("title")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <SavedFiltersList
                  filterType="collectiveProcesses"
                  onApplyFilter={handleApplySavedFilter}
                />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save Filter Button */}
            <SaveFilterButton
              hasActiveFilters={hasActiveFilters}
              onClick={() => setIsSaveFilterSheetOpen(true)}
            />

            <ExportDataDialog defaultExportType="collectiveProcesses" />
            <Button onClick={() => router.push('/collective-processes/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {tCommon('create')}
            </Button>
          </div>
        </div>

        <CollectiveProcessesTable
          collectiveProcesses={filteredCollectiveProcesses}
          onView={handleView}
          onEdit={handleEdit}
          filterSlot={
            <MultiSelect
              options={processTypeOptions}
              defaultValue={selectedProcessTypes}
              onValueChange={setSelectedProcessTypes}
              placeholder={t('selectProcessType')}
              className="w-full sm:w-[250px]"
            />
          }
        />

        {/* Save Filter Sheet */}
        <SaveFilterSheet
          open={isSaveFilterSheetOpen}
          onOpenChange={setIsSaveFilterSheetOpen}
          filterType="collectiveProcesses"
          currentFilters={getCurrentFilterCriteria()}
          onSaveSuccess={() => {
            toast.success(tSavedFilters("success.filterSaved"))
          }}
        />
      </div>
    </>
  )
}
