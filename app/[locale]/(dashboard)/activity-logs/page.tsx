"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { ActivityLogsTable } from "@/components/activity-logs/activity-logs-table"
import { ActivityLogFilters } from "@/components/activity-logs/activity-log-filters"
import { ActivityDetailsDialog } from "@/components/activity-logs/activity-details-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { toast } from "sonner"

export default function ActivityLogsPage() {
  const t = useTranslations('ActivityLogs')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  // State for filters
  const [userId, setUserId] = useState<Id<"users"> | undefined>()
  const [entityType, setEntityType] = useState<string | undefined>()
  const [entityId, setEntityId] = useState<string | undefined>()
  const [action, setAction] = useState<string | undefined>()
  const [startDate, setStartDate] = useState<number | undefined>()
  const [endDate, setEndDate] = useState<number | undefined>()

  // State for details dialog
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

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
    setSelectedLog(log)
    setDetailsDialogOpen(true)
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

  return (
    <div className="flex flex-col h-full">
      <DashboardPageHeader breadcrumbs={breadcrumbs} />

      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Filters */}
          <ActivityLogFilters
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />

          {/* Export buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {t('exportCsv')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("json")}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {t('exportJson')}
            </Button>
          </div>

          {/* Table */}
          <ActivityLogsTable
            logs={logsResult?.logs || []}
            onViewDetails={handleViewDetails}
          />

          {/* Load more / pagination info */}
          {logsResult && (
            <div className="text-sm text-muted-foreground text-center">
              {t('showingResults', {
                count: logsResult.logs.length,
                total: logsResult.total
              })}
            </div>
          )}
        </CardContent>
      </Card>

        {/* Details Dialog */}
        <ActivityDetailsDialog
          log={selectedLog}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      </div>
    </div>
  )
}
