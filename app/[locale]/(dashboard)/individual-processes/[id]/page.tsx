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
import { Edit, RefreshCcw, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { DocumentChecklistCard } from "@/components/individual-processes/document-checklist-card"
import { GovernmentProtocolCard } from "@/components/individual-processes/government-protocol-card"
import { ProcessTimeline } from "@/components/collective-processes/process-timeline"
import { StatusUpdateDialog } from "@/components/collective-processes/status-update-dialog"
import { EntityHistory } from "@/components/activity-logs/entity-history"
import { Skeleton } from "@/components/ui/skeleton"
import { IndividualProcessStatusesSubtable } from "@/components/individual-processes/individual-process-statuses-subtable"
import { ProcessNotesSection } from "@/components/notes/process-notes-section"
import { ProcessTasksSection } from "@/components/tasks/process-tasks-section"
import { PersonFormDialog } from "@/components/people/person-form-dialog"
import { formatDate } from "@/lib/format-field-value"
import { formatCPF } from "@/lib/utils/document-masks"
import { translateCountryName } from "@/lib/utils/country-translations"
import { formatRelativeDate } from "@/lib/utils/date-utils"

interface IndividualProcessDetailPageProps {
  params: Promise<{
    id: string
    locale: string
  }>
  searchParams: Promise<{
    collectiveProcessId?: string
    fromTask?: string
  }>
}

export default function IndividualProcessDetailPage({ params, searchParams }: IndividualProcessDetailPageProps) {
  const resolvedParams = use(params)
  const resolvedSearchParams = use(searchParams)
  const t = useTranslations('IndividualProcesses')
  const tCommon = useTranslations('Common')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tPeople = useTranslations('People')
  const router = useRouter()

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isPersonEditDialogOpen, setIsPersonEditDialogOpen] = useState(false)

  const processId = resolvedParams.id as Id<"individualProcesses">
  const collectiveProcessId = resolvedSearchParams.collectiveProcessId as Id<"collectiveProcesses"> | undefined
  const fromTaskId = resolvedSearchParams.fromTask

  const individualProcess = useQuery(api.individualProcesses.get, { id: processId })
  const currentUser = useQuery(api.userProfiles.getCurrentUser)

  // Fetch collective process data when coming from collective process context
  const collectiveProcess = useQuery(
    api.collectiveProcesses.get,
    collectiveProcessId ? { id: collectiveProcessId } : "skip"
  )

  // Build breadcrumbs based on context
  const breadcrumbs = collectiveProcessId && collectiveProcess
    ? [
        { label: tBreadcrumbs('dashboard'), href: '/dashboard' },
        { label: tBreadcrumbs('processManagement') },
        { label: tBreadcrumbs('collectiveProcesses'), href: '/collective-processes' },
        { label: collectiveProcess.referenceNumber || '...', href: `/collective-processes/${collectiveProcessId}` },
        { label: individualProcess?.person?.fullName || t('details') }
      ]
    : [
        { label: tBreadcrumbs('dashboard'), href: '/dashboard' },
        { label: tBreadcrumbs('processManagement') },
        { label: tBreadcrumbs('individualProcesses'), href: '/individual-processes' },
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
              onClick={() => router.push('/individual-processes')}
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
        {/* Back to Task button */}
        {fromTaskId && (
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => router.push(`/tasks?highlight=${fromTaskId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToTask') || 'Voltar para Tarefa'}
          </Button>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{individualProcess.person?.fullName || t('details')}</h1>
            <p className="text-muted-foreground">
              {t('referenceNumber')}: {individualProcess.collectiveProcess?.referenceNumber || '-'}
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
            <Button onClick={() => router.push(`/individual-processes/${processId}/edit${collectiveProcessId ? `?collectiveProcessId=${collectiveProcessId}` : ''}`)}>
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
                <div className="text-sm font-medium">{t('dateProcess')}</div>
                <div className="text-sm">
                  {individualProcess.dateProcess
                    ? formatDate(individualProcess.dateProcess, resolvedParams.locale)
                    : '-'}
                </div>

                <div className="text-sm font-medium">{t('userApplicant')}</div>
                <div className="text-sm">
                  {individualProcess.userApplicant && individualProcess.userApplicant.company
                    ? `${individualProcess.userApplicant.fullName} - ${individualProcess.userApplicant.company.name}`
                    : '-'}
                </div>

                <div className="text-sm font-medium">{t('cbo')}</div>
                <div className="text-sm">
                  {individualProcess.cbo
                    ? `${individualProcess.cbo.code} - ${individualProcess.cbo.title}`
                    : '-'}
                </div>

                <div className="text-sm font-medium">{t('funcao')}</div>
                <div className="text-sm">{individualProcess.funcao || '-'}</div>

                <div className="text-sm font-medium">{t('processType')}</div>
                <div className="text-sm">{individualProcess.processType?.name || '-'}</div>

                <div className="text-sm font-medium">{t('legalFramework')}</div>
                <div className="text-sm">{individualProcess.legalFramework?.name || '-'}</div>

                <div className="text-sm font-medium">{t('companyApplicant')}</div>
                <div className="text-sm">
                  {individualProcess.companyApplicant?.name || '-'}
                </div>

                <div className="text-sm font-medium">{t('consulate')}</div>
                <div className="text-sm">
                  {individualProcess.consulate?.city?.name || '-'}
                </div>

                <div className="text-sm font-medium">{t('deadlineDate')}</div>
                <div className="text-sm">
                  {(() => {
                    const process = individualProcess as any;
                    if (process.deadlineQuantity && process.deadlineUnit) {
                      const quantity = process.deadlineQuantity;
                      const unit = process.deadlineUnit;
                      const unitLabel = unit === 'years'
                        ? (quantity === 1 ? (resolvedParams.locale === 'en' ? 'year' : 'ano') : (resolvedParams.locale === 'en' ? 'years' : 'anos'))
                        : unit === 'months'
                        ? (quantity === 1 ? (resolvedParams.locale === 'en' ? 'month' : 'mês') : (resolvedParams.locale === 'en' ? 'months' : 'meses'))
                        : (quantity === 1 ? (resolvedParams.locale === 'en' ? 'day' : 'dia') : (resolvedParams.locale === 'en' ? 'days' : 'dias'));
                      return `${quantity} ${unitLabel}`;
                    }
                    return individualProcess.deadlineDate || '-';
                  })()}
                </div>

                <div className="text-sm font-medium">{t('protocolNumber')}</div>
                <div className="text-sm font-mono">{individualProcess.protocolNumber || '-'}</div>
              </div>
            </CardContent>
          </Card>

          {/* Person Information Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1.5">
                <CardTitle>{t('personInformation')}</CardTitle>
                <CardDescription>{t('personInformationDescription')}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPersonEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                {tCommon('edit')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">{tPeople('cpf')}</div>
                <div className="text-sm">{individualProcess.person?.cpf ? formatCPF(individualProcess.person.cpf) : '-'}</div>

                <div className="text-sm font-medium">{tPeople('nationality')}</div>
                <div className="text-sm">{(individualProcess.person as any)?.nationality?.name ? translateCountryName((individualProcess.person as any).nationality.name, resolvedParams.locale) : '-'}</div>

                <div className="text-sm font-medium">{tPeople('maritalStatus')}</div>
                <div className="text-sm">
                  {individualProcess.person?.maritalStatus
                    ? tPeople(`maritalStatus${individualProcess.person.maritalStatus.charAt(0).toUpperCase() + individualProcess.person.maritalStatus.slice(1)}`)
                    : '-'}
                </div>

                <div className="text-sm font-medium">{tPeople('birthDate')}</div>
                <div className="text-sm">
                  {individualProcess.person?.birthDate
                    ? formatDate(individualProcess.person.birthDate, resolvedParams.locale)
                    : '-'}
                </div>

                <div className="text-sm font-medium">{tPeople('fatherName')}</div>
                <div className="text-sm">{individualProcess.person?.fatherName || '-'}</div>

                <div className="text-sm font-medium">{tPeople('motherName')}</div>
                <div className="text-sm">{individualProcess.person?.motherName || '-'}</div>

                <div className="text-sm font-medium">{tPeople('profession')}</div>
                <div className="text-sm">{individualProcess.person?.profession || '-'}</div>

                <div className="text-sm font-medium">{t('qualification')}</div>
                <div className="text-sm">
                  {individualProcess.qualification
                    ? t(`qualificationOptions.${individualProcess.qualification}`)
                    : '-'}
                </div>

                <div className="text-sm font-medium">{t('professionalExperienceSince')}</div>
                <div className="text-sm">
                  {individualProcess.professionalExperienceSince
                    ? (() => {
                        const relativeDate = formatRelativeDate(individualProcess.professionalExperienceSince, {
                          year: t("relativeDate.year"),
                          years: t("relativeDate.years"),
                          month: t("relativeDate.month"),
                          months: t("relativeDate.months"),
                          day: t("relativeDate.day"),
                          days: t("relativeDate.days"),
                        });
                        return relativeDate || formatDate(individualProcess.professionalExperienceSince, resolvedParams.locale);
                      })()
                    : '-'}
                </div>

                {individualProcess.lastSalaryAmount && (
                  <>
                    <div className="text-sm font-medium">{t('lastSalaryAmount')}</div>
                    <div className="text-sm">
                      {individualProcess.lastSalaryCurrency} {individualProcess.lastSalaryAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </>
                )}

                {individualProcess.exchangeRateToBRL && (
                  <>
                    <div className="text-sm font-medium">{t('exchangeRateToBRL')}</div>
                    <div className="text-sm">
                      {individualProcess.exchangeRateToBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </>
                )}

                {individualProcess.salaryInBRL && (
                  <>
                    <div className="text-sm font-medium">{t('salaryInBRL')}</div>
                    <div className="text-sm">
                      R$ {individualProcess.salaryInBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </>
                )}

                {individualProcess.monthlyAmountToReceive && (
                  <>
                    <div className="text-sm font-medium">{t('monthlyAmountToReceive')}</div>
                    <div className="text-sm">
                      R$ {individualProcess.monthlyAmountToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status History - Interactive Table */}
        <Card className="md:max-w-[50%]">
          <CardContent className="pt-6">
            {currentUser && (
              <IndividualProcessStatusesSubtable
                individualProcessId={processId}
                userRole={currentUser.role}
                showDescription={false}
              />
            )}
          </CardContent>
        </Card>

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

        {/* Notes Section */}
        <ProcessNotesSection
          individualProcessId={processId}
          currentUserId={currentUser?.userId}
          isAdmin={currentUser?.role === "admin"}
        />

        {/* Tasks Section */}
        <ProcessTasksSection
          individualProcessId={processId}
          currentUserId={currentUser?.userId}
          isAdmin={currentUser?.role === "admin"}
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

      {/* Person Edit Dialog */}
      <PersonFormDialog
        open={isPersonEditDialogOpen}
        onOpenChange={setIsPersonEditDialogOpen}
        personId={individualProcess.personId}
        onSuccess={() => {
          setIsPersonEditDialogOpen(false)
        }}
      />
    </>
  )
}
