"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { CollectiveProcessDetailCard } from "@/components/collective-processes/collective-process-detail-card"
import { IndividualProcessesTable } from "@/components/individual-processes/individual-processes-table"
import { BulkStatusUpdateDialog } from "@/components/collective-processes/bulk-status-update-dialog"
import { AddPeopleToCollectiveDialog } from "@/components/collective-processes/add-people-to-collective-dialog"
import { CollectiveStatusUpdateDialog } from "@/components/collective-processes/collective-status-update-dialog"
import { AddStatusDialog } from "@/components/individual-processes/add-status-dialog"
import { EntityHistory } from "@/components/activity-logs/entity-history"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, RefreshCcw } from "lucide-react"
import { ProcessNotesSection } from "@/components/notes/process-notes-section"
import { ProcessTasksSection } from "@/components/tasks/process-tasks-section"

export default function CollectiveProcessDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('CollectiveProcesses')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const locale = params.locale as string
  const collectiveProcessId = params.id as Id<"collectiveProcesses">

  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false)
  const [addPeopleDialogOpen, setAddPeopleDialogOpen] = useState(false)
  const [collectiveStatusDialogOpen, setCollectiveStatusDialogOpen] = useState(false)
  const [individualStatusDialogOpen, setIndividualStatusDialogOpen] = useState(false)
  const [selectedIndividualProcessId, setSelectedIndividualProcessId] = useState<Id<"individualProcesses"> | null>(null)
  const [selectedProcesses, setSelectedProcesses] = useState<Array<{ _id: Id<"individualProcesses">; personId: Id<"people">; status?: string }>>([])

  const collectiveProcess = useQuery(api.collectiveProcesses.get, {
    id: collectiveProcessId,
  })
  const currentUser = useQuery(api.userProfiles.getCurrentUser)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: '/dashboard' },
    { label: tBreadcrumbs('processManagement') },
    { label: tBreadcrumbs('collectiveProcesses'), href: '/collective-processes' },
    { label: collectiveProcess?.referenceNumber || "..." }
  ]

  const handleViewIndividual = (id: Id<"individualProcesses">) => {
    router.push(`/individual-processes/${id}`)
  }

  const handleEditIndividual = (id: Id<"individualProcesses">) => {
    router.push(`/individual-processes/${id}/edit`)
  }

  const handleAddPeople = () => {
    setAddPeopleDialogOpen(true)
  }

  const handleCollectiveStatusUpdate = () => {
    setCollectiveStatusDialogOpen(true)
  }

  const handleBulkStatusUpdate = (selected: Array<{ _id: Id<"individualProcesses">; personId: Id<"people">; status?: string }>) => {
    setSelectedProcesses(selected)
    setBulkStatusDialogOpen(true)
  }

  const handleBulkStatusUpdateSuccess = () => {
    router.refresh()
  }

  const handleAddPeopleSuccess = () => {
    router.refresh()
  }

  const handleCollectiveStatusSuccess = () => {
    router.refresh()
  }

  const handleUpdateIndividualStatus = (id: Id<"individualProcesses">) => {
    setSelectedIndividualProcessId(id)
    setIndividualStatusDialogOpen(true)
  }

  if (collectiveProcess === undefined) {
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

  if (collectiveProcess === null) {
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

  const individualProcesses = collectiveProcess.individualProcesses || []

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Collective Process Overview */}
        <CollectiveProcessDetailCard collectiveProcess={collectiveProcess} />

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
                <Button variant="outline" onClick={handleCollectiveStatusUpdate}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {t('updateCollectiveStatus')}
                </Button>
                <Button onClick={handleAddPeople}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('addPeople')}
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
                onUpdateStatus={handleUpdateIndividualStatus}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                {t('noIndividualProcesses')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Section */}
        <ProcessNotesSection
          collectiveProcessId={collectiveProcessId}
          currentUserId={currentUser?.userId}
          isAdmin={currentUser?.role === "admin"}
        />

        {/* Tasks Section */}
        <ProcessTasksSection
          collectiveProcessId={collectiveProcessId}
          currentUserId={currentUser?.userId}
          isAdmin={currentUser?.role === "admin"}
        />

        {/* Activity History */}
        <EntityHistory
          entityType="collectiveProcesses"
          entityId={collectiveProcessId}
          title={t('activityHistory')}
        />
      </div>

      {/* Bulk Status Update Dialog (for selected individual processes) */}
      <BulkStatusUpdateDialog
        open={bulkStatusDialogOpen}
        onOpenChange={setBulkStatusDialogOpen}
        selectedProcesses={selectedProcesses}
        onSuccess={handleBulkStatusUpdateSuccess}
      />

      {/* Add People to Collective Dialog */}
      <AddPeopleToCollectiveDialog
        open={addPeopleDialogOpen}
        onOpenChange={setAddPeopleDialogOpen}
        collectiveProcessId={collectiveProcessId}
        onSuccess={handleAddPeopleSuccess}
      />

      {/* Collective Status Update Dialog */}
      <CollectiveStatusUpdateDialog
        open={collectiveStatusDialogOpen}
        onOpenChange={setCollectiveStatusDialogOpen}
        collectiveProcessId={collectiveProcessId}
        onSuccess={handleCollectiveStatusSuccess}
      />

      {/* Individual Status Update Dialog */}
      {selectedIndividualProcessId && (
        <AddStatusDialog
          individualProcessId={selectedIndividualProcessId}
          open={individualStatusDialogOpen}
          onOpenChange={(open) => {
            setIndividualStatusDialogOpen(open)
            if (!open) {
              setSelectedIndividualProcessId(null)
              router.refresh()
            }
          }}
        />
      )}
    </>
  )
}
