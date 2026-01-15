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
import { FileDown, FileSpreadsheet, FileJson } from "lucide-react"
import { toast } from "sonner"

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

  // State for view modal
  const [viewingLog, setViewingLog] = useState<Id<"activityLogs"> | undefined>()

  // Fetch activity logs with filters
  const logsResult = useQuery(api.activityLogs.getActivityLogs, {
    userId,
    entityType,
    entityId,
    action,
    startDate,
    endDate,
    limit: 100,
  })

  // Export action
  const exportLogs = useAction(api.activityLogs.exportActivityLogs)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('activityLogs') }
  ]

  const handleViewDetails = (log: any) => {
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
    } catch (error: any) {
      toast.error(error.message || t('exportError'))
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
  }

  const handleClearFilters = () => {
    setUserId(undefined)
    setEntityType(undefined)
    setEntityId(undefined)
    setAction(undefined)
    setStartDate(undefined)
    setEndDate(undefined)
  }

  // Check if any filter is active
  const hasActiveFilters = entityType || entityId || action || startDate || endDate

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
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          hasActiveFilters={!!hasActiveFilters}
        />

        {/* Table */}
        <ActivityLogsTable
          logs={logsResult?.logs || []}
          onViewDetails={handleViewDetails}
          totalCount={logsResult?.total}
        />

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
