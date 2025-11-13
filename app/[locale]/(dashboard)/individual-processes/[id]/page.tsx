"use client"

import { use, useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, RefreshCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { DocumentChecklistCard } from "@/components/individual-processes/document-checklist-card"
import { GovernmentProtocolCard } from "@/components/individual-processes/government-protocol-card"
import { ProcessTimeline } from "@/components/main-processes/process-timeline"
import { StatusUpdateDialog } from "@/components/main-processes/status-update-dialog"
import { EntityHistory } from "@/components/activity-logs/entity-history"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusHistoryTimeline } from "@/components/individual-processes/status-history-timeline"

interface IndividualProcessDetailPageProps {
  params: Promise<{
    id: string
    locale: string
  }>
}

export default function IndividualProcessDetailPage({ params }: IndividualProcessDetailPageProps) {
  const resolvedParams = use(params)
  const t = useTranslations('IndividualProcesses')
  const tCommon = useTranslations('Common')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const router = useRouter()

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)

  const processId = resolvedParams.id as Id<"individualProcesses">
  const individualProcess = useQuery(api.individualProcesses.get, { id: processId })

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: `/${resolvedParams.locale}/dashboard` },
    { label: tBreadcrumbs('processManagement') },
    { label: tBreadcrumbs('individualProcesses'), href: `/${resolvedParams.locale}/individual-processes` },
    { label: individualProcess?.person?.fullName || t('details') }
  ]

  if (individualProcess === undefined) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  if (individualProcess === null) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold">{t('notFound')}</h2>
            <p className="text-muted-foreground mt-2">{t('notFoundDescription')}</p>
            <Button
              onClick={() => router.push(`/${resolvedParams.locale}/individual-processes`)}
              className="mt-4"
            >
              {t('backToList')}
            </Button>
          </div>
        </div>
      </>
    )
  }

  const statusVariant = individualProcess.status === "completed"
    ? "default"
    : individualProcess.status === "in_progress"
    ? "secondary"
    : "outline"

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{individualProcess.person?.fullName || t('details')}</h1>
            <p className="text-muted-foreground">
              {t('referenceNumber')}: {individualProcess.mainProcess?.referenceNumber || '-'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsStatusDialogOpen(true)}
              variant="outline"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t('updateStatus')}
            </Button>
            <Button onClick={() => router.push(`/${resolvedParams.locale}/individual-processes/${processId}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              {tCommon('edit')}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Process Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('processInformation')}</CardTitle>
              <CardDescription>{t('processInformationDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">{t('status')}</div>
                <div>
                  <Badge variant={statusVariant}>
                    {individualProcess.activeStatus?.statusName || individualProcess.status}
                  </Badge>
                </div>

                <div className="text-sm font-medium">{t('legalFramework')}</div>
                <div className="text-sm">{individualProcess.legalFramework?.name || '-'}</div>

                <div className="text-sm font-medium">{t('protocolNumber')}</div>
                <div className="text-sm font-mono">{individualProcess.protocolNumber || '-'}</div>

                <div className="text-sm font-medium">{t('rnmNumber')}</div>
                <div className="text-sm font-mono">{individualProcess.rnmNumber || '-'}</div>

                <div className="text-sm font-medium">{t('rnmDeadline')}</div>
                <div className="text-sm">{individualProcess.rnmDeadline || '-'}</div>

                <div className="text-sm font-medium">{t('deadlineDate')}</div>
                <div className="text-sm">{individualProcess.deadlineDate || '-'}</div>

                <div className="text-sm font-medium">{t('isActive')}</div>
                <div>
                  <Badge variant={individualProcess.isActive ? "default" : "secondary"}>
                    {individualProcess.isActive ? tCommon('active') : tCommon('inactive')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Person Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('personInformation')}</CardTitle>
              <CardDescription>{t('personInformationDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">{t('personName')}</div>
                <div className="text-sm">{individualProcess.person?.fullName || '-'}</div>

                <div className="text-sm font-medium">{t('email')}</div>
                <div className="text-sm">{individualProcess.person?.email || '-'}</div>

                <div className="text-sm font-medium">{t('applicant')}</div>
                <div className="text-sm">
                  {individualProcess.applicant && individualProcess.applicant.company
                    ? `${individualProcess.applicant.fullName} - ${individualProcess.applicant.company.name}`
                    : '-'}
                </div>

                {individualProcess.cbo && (
                  <>
                    <div className="text-sm font-medium">{t('cboCode')}</div>
                    <div className="text-sm">{individualProcess.cbo.code} - {individualProcess.cbo.title}</div>
                  </>
                )}

                {individualProcess.mreOfficeNumber && (
                  <>
                    <div className="text-sm font-medium">{t('mreOfficeNumber')}</div>
                    <div className="text-sm font-mono">{individualProcess.mreOfficeNumber}</div>
                  </>
                )}

                {individualProcess.douNumber && (
                  <>
                    <div className="text-sm font-medium">{t('douNumber')}</div>
                    <div className="text-sm font-mono">{individualProcess.douNumber}</div>
                  </>
                )}

                {individualProcess.appointmentDateTime && (
                  <>
                    <div className="text-sm font-medium">{t('appointmentDateTime')}</div>
                    <div className="text-sm">{individualProcess.appointmentDateTime}</div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status History Timeline - New System */}
        <StatusHistoryTimeline individualProcessId={processId} />

        {/* Process History Timeline - Legacy */}
        <Card>
          <CardHeader>
            <CardTitle>{t('processHistory')}</CardTitle>
            <CardDescription>{t('processHistoryDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProcessTimeline individualProcessId={processId} />
          </CardContent>
        </Card>

        {/* Document Checklist Section */}
        <DocumentChecklistCard individualProcessId={processId} />

        {/* Government Protocol Tracking Section */}
        <GovernmentProtocolCard
          individualProcess={individualProcess}
          isAdmin={true}
        />

        {/* Activity History */}
        <EntityHistory
          entityType="individualProcesses"
          entityId={processId}
          title={t('activityHistory')}
        />
      </div>

      {/* Status Update Dialog */}
      <StatusUpdateDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        individualProcessId={processId}
        currentStatus={individualProcess.activeStatus?.statusName || individualProcess.status || ""}
        onSuccess={() => {
          // Dialog will close automatically, data will refresh via Convex
        }}
      />
    </>
  )
}
