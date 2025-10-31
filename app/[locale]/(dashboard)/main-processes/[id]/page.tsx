"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { MainProcessDetailCard } from "@/components/main-processes/main-process-detail-card"
import { IndividualProcessesTable } from "@/components/individual-processes/individual-processes-table"
import { BulkStatusUpdateDialog } from "@/components/main-processes/bulk-status-update-dialog"
import { BulkCreateIndividualProcessDialog } from "@/components/main-processes/bulk-create-individual-process-dialog"
import { EntityHistory } from "@/components/activity-logs/entity-history"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, UserPlus } from "lucide-react"

export default function MainProcessDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('MainProcesses')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const mainProcessId = params.id as Id<"mainProcesses">

  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false)
  const [bulkCreateDialogOpen, setBulkCreateDialogOpen] = useState(false)
  const [selectedProcesses, setSelectedProcesses] = useState<Array<{ _id: Id<"individualProcesses">; personId: Id<"people">; status?: string }>>([])

  const mainProcess = useQuery(api.mainProcesses.get, {
    id: mainProcessId,
  })

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('processManagement') },
    { label: tBreadcrumbs('mainProcesses'), href: "/main-processes" },
    { label: mainProcess?.referenceNumber || "..." }
  ]

  const handleViewIndividual = (id: Id<"individualProcesses">) => {
    router.push(`/individual-processes/${id}`)
  }

  const handleEditIndividual = (id: Id<"individualProcesses">) => {
    router.push(`/individual-processes/${id}/edit`)
  }

  const handleAddIndividual = () => {
    router.push(`/individual-processes/new?mainProcessId=${mainProcessId}`)
  }

  const handleBulkAddPeople = () => {
    setBulkCreateDialogOpen(true)
  }

  const handleBulkStatusUpdate = (selected: Array<{ _id: Id<"individualProcesses">; personId: Id<"people">; status?: string }>) => {
    setSelectedProcesses(selected)
    setBulkStatusDialogOpen(true)
  }

  const handleBulkStatusUpdateSuccess = () => {
    router.refresh()
  }

  const handleBulkCreateSuccess = () => {
    router.refresh()
  }

  if (mainProcess === undefined) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{tCommon('loading')}</p>
          </div>
        </div>
      </>
    )
  }

  if (mainProcess === null) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Process not found</p>
          </div>
        </div>
      </>
    )
  }

  // Calculate aggregate status summary
  const individualProcesses = mainProcess.individualProcesses || []
  const statusCounts = individualProcesses.reduce((acc, ip) => {
    const status = ip.status || "unknown"
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const completedCount = statusCounts["completed"] || 0
  const cancelledCount = statusCounts["cancelled"] || 0
  const totalCount = individualProcesses.length
  const completionPercentage = totalCount > 0
    ? Math.round(((completedCount + cancelledCount) / totalCount) * 100)
    : 0

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Main Process Overview */}
        <MainProcessDetailCard mainProcess={mainProcess} />

        {/* Aggregate Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t('statusSummary')}</CardTitle>
            <CardDescription>
              {t('statusSummaryDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('overallProgress')}</span>
                  <span className="font-medium">{completionPercentage}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {completedCount} {t('completed')}, {cancelledCount} {t('cancelled')}, {totalCount - completedCount - cancelledCount} {t('inProgress')}
                </div>
              </div>

              {/* Status breakdown */}
              {Object.entries(statusCounts).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      <StatusBadge status={status} type="individual_process" />
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Individual Processes Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('individualProcesses')}</CardTitle>
                <CardDescription>
                  {t('individualProcessesDescription')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBulkAddPeople}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('bulkAddPeople')}
                </Button>
                <Button onClick={handleAddIndividual}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addIndividual')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {individualProcesses.length > 0 ? (
              <IndividualProcessesTable
                individualProcesses={individualProcesses}
                onView={handleViewIndividual}
                onEdit={handleEditIndividual}
                onBulkStatusUpdate={handleBulkStatusUpdate}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                {t('noIndividualProcesses')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Process Notes */}
        {mainProcess.notes && (
          <Card>
            <CardHeader>
              <CardTitle>{t('notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{mainProcess.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Activity History */}
        <EntityHistory
          entityType="mainProcesses"
          entityId={mainProcessId}
          title={t('activityHistory')}
        />
      </div>

      {/* Bulk Status Update Dialog */}
      <BulkStatusUpdateDialog
        open={bulkStatusDialogOpen}
        onOpenChange={setBulkStatusDialogOpen}
        selectedProcesses={selectedProcesses}
        onSuccess={handleBulkStatusUpdateSuccess}
      />

      {/* Bulk Create Individual Process Dialog */}
      <BulkCreateIndividualProcessDialog
        open={bulkCreateDialogOpen}
        onOpenChange={setBulkCreateDialogOpen}
        mainProcessId={mainProcessId}
        onSuccess={handleBulkCreateSuccess}
      />
    </>
  )
}
