"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { ActivityLogsTable } from "@/components/activity-logs/activity-logs-table"
import { ActivityLogFilters } from "@/components/activity-logs/activity-log-filters"
import { ActivityLogViewModal } from "@/components/activity-logs/activity-log-view-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileSpreadsheet, FileJson, Plus } from "lucide-react"
import { toast } from "sonner"

const INITIAL_LIMIT = 300

export function ActivityLogsClient() {
  const t = useTranslations('ActivityLogs')
  const tBreadcrumbs = useTranslations('Breadcrumbs')

  // State for filters
  const [userId, setUserId] = useState<Id<"users"> | undefined>()
  const [entityType, setEntityType] = useState<string | undefined>()
  const [entityId, setEntityId] = useState<string | undefined>()
  const [action, setAction] = useState<string | undefined>()
  const [startDate, setStartDate] = useState<number | undefined>()
  const [endDate, setEndDate] = useState<number | undefined>()
  const [limit, setLimit] = useState(INITIAL_LIMIT)

  // State for view modal
  const [viewingLog, setViewingLog] = useState<Id<"activityLogs"> | undefined>()

  // Filter options
  const filterOptions = useQuery(api.activityLogs.getFilterOptions, {})

  // Fetch activity logs with filters
  const logsResult = useQuery(api.activityLogs.getActivityLogs, {
    userId,
    entityType,
    entityId,
    action,
    startDate,
    endDate,
    limit,
  })

  const summary = useQuery(api.activityLogs.getAuditSummary, {
    userId,
    entityType,
    action,
    startDate,
    endDate,
  })

  // Export action
  const exportLogs = useAction(api.activityLogs.exportActivityLogs)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('activityLogs') }
  ]

  const handleViewDetails = (log: { _id: Id<"activityLogs"> }) => {
    setViewingLog(log._id)
  }

  const handleExport = async (format: "csv" | "json") => {
    try {
      const result = await exportLogs({
        userId,
        entityType,
        entityId,
        action,
        startDate,
        endDate,
        format,
      })

      // Create download link
      const blob = new Blob([result.data], {
        type: format === "csv" ? "text/csv" : "application/json"
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(t('exportSuccess'))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('exportError')
      toast.error(message || t('exportError'))
    }
  }

  const handleFiltersChange = (filters: {
    userId?: Id<"users">
    entityType?: string
    entityId?: string
    action?: string
    startDate?: number
    endDate?: number
  }) => {
    setUserId(filters.userId)
    setEntityType(filters.entityType)
    setEntityId(filters.entityId)
    setAction(filters.action)
    setStartDate(filters.startDate)
    setEndDate(filters.endDate)
    setLimit(INITIAL_LIMIT)
  }

  const handleClearFilters = () => {
    setUserId(undefined)
    setEntityType(undefined)
    setEntityId(undefined)
    setAction(undefined)
    setStartDate(undefined)
    setEndDate(undefined)
    setLimit(INITIAL_LIMIT)
  }

  // Check if any filter is active
  const hasActiveFilters = userId || entityType || entityId || action || startDate || endDate

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Header with title and export buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {t('exportCsv')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("json")}
            >
              <FileJson className="h-4 w-4 mr-2" />
              {t('exportJson')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <ActivityLogFilters
          filterOptions={filterOptions}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          hasActiveFilters={!!hasActiveFilters}
        />

        <Card className="overflow-hidden border-dashed bg-gradient-to-b from-muted/20 to-background">
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{t("totalLogs")}</p>
                <p className="text-xl font-semibold">{summary?.total ?? 0}</p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{t("createdCount")}</p>
                <p className="text-xl font-semibold text-emerald-600">{summary?.created ?? 0}</p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{t("updatedCount")}</p>
                <p className="text-xl font-semibold text-blue-600">{summary?.updated ?? 0}</p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{t("deletedCount")}</p>
                <p className="text-xl font-semibold text-red-600">{summary?.deleted ?? 0}</p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{t("usersWithActivity")}</p>
                <p className="text-xl font-semibold">{summary?.uniqueUsers ?? 0}</p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{t("entitiesWithActivity")}</p>
                <p className="text-xl font-semibold">{summary?.uniqueEntities ?? 0}</p>
              </div>
            </div>
            {!!summary?.logsWithoutProfile && (
              <p className="mt-3 text-xs text-amber-600">
                {t("logsWithoutProfileWarning", { count: summary.logsWithoutProfile })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <ActivityLogsTable
          logs={logsResult?.logs || []}
          onViewDetails={handleViewDetails}
          totalCount={logsResult?.total}
        />

        {logsResult?.hasMore && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit((current) => current + INITIAL_LIMIT)}
              className="h-9 px-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("loadMore")}
            </Button>
          </div>
        )}

        {/* View Modal */}
        {viewingLog && (
          <ActivityLogViewModal
            activityLogId={viewingLog}
            open={true}
            onOpenChange={(open) => !open && setViewingLog(undefined)}
          />
        )}
      </div>
    </>
  )
}
