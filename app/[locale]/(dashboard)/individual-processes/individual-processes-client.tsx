"use client"

import { useState, useMemo } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations, useLocale } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { IndividualProcessesTable } from "@/components/individual-processes/individual-processes-table"
import { IndividualProcessFormDialog } from "@/components/individual-processes/individual-process-form-dialog"
import { FillFieldsModal } from "@/components/individual-processes/fill-fields-modal"
import { CreateFromExistingDialog } from "@/components/individual-processes/create-from-existing-dialog"
import { Button } from "@/components/ui/button"
import { ExportDataDialog } from "@/components/ui/export-data-dialog"
import { Filters, type Filter, type FilterFieldConfig } from "@/components/ui/filters"
import { Plus, User, Building2, FileText, Scale, Activity, Calendar } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { useRouter } from "next/navigation"

export function IndividualProcessesClient() {
  const t = useTranslations('IndividualProcesses')
  const tCommon = useTranslations('Common')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const router = useRouter()
  const locale = useLocale()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProcessId, setSelectedProcessId] = useState<Id<"individualProcesses"> | undefined>(undefined)
  const [fillFieldsModalOpen, setFillFieldsModalOpen] = useState(false)
  const [selectedStatusId, setSelectedStatusId] = useState<Id<"individualProcessStatuses"> | undefined>(undefined)
  const [createFromDialogOpen, setCreateFromDialogOpen] = useState(false)
  const [sourceProcessId, setSourceProcessId] = useState<Id<"individualProcesses"> | undefined>(undefined)
  const [filters, setFilters] = useState<Filter<string>[]>([])
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [isRnmModeActive, setIsRnmModeActive] = useState(false)

  const individualProcesses = useQuery(api.individualProcesses.list, {}) ?? []
  const deleteIndividualProcess = useMutation(api.individualProcesses.remove)
  const createFromExisting = useMutation(api.individualProcesses.createFromExisting)

  // Fetch filter options
  const processTypes = useQuery(api.processTypes.listActive, {}) ?? []
  const legalFrameworks = useQuery(api.legalFrameworks.listActive, {}) ?? []
  const caseStatuses = useQuery(api.caseStatuses.listActive, {}) ?? []

  // Get unique applicants from the individual processes data
  const applicantOptions = useMemo(() => {
    const uniqueApplicants = new Map<string, string>()
    individualProcesses.forEach((process) => {
      if (process.companyApplicant) {
        uniqueApplicants.set(process.companyApplicant._id, process.companyApplicant.name)
      }
    })
    return Array.from(uniqueApplicants.entries()).map(([id, name]) => ({
      value: id,
      label: name,
    }))
  }, [individualProcesses])

  // Get unique candidates from the individual processes data
  const candidateOptions = useMemo(() => {
    const uniqueCandidates = new Map<string, string>()
    individualProcesses.forEach((process) => {
      if (process.person) {
        uniqueCandidates.set(process.person._id, process.person.fullName)
      }
    })
    return Array.from(uniqueCandidates.entries())
      .map(([id, name]) => ({
        value: id,
        label: name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [individualProcesses])

  // Filter field configuration
  const filterFields: FilterFieldConfig<string>[] = useMemo(() => [
    {
      key: "candidate",
      label: t("filters.candidate"),
      icon: <User className="h-4 w-4" />,
      type: "text",
      placeholder: t("filters.placeholders.enterCandidate"),
    },
    {
      key: "applicant",
      label: t("filters.applicant"),
      icon: <Building2 className="h-4 w-4" />,
      type: "select",
      options: applicantOptions,
      searchable: true,
      placeholder: t("filters.placeholders.selectApplicant"),
    },
    {
      key: "processType",
      label: t("filters.authorizationType"),
      icon: <FileText className="h-4 w-4" />,
      type: "select",
      options: processTypes.map((pt) => ({
        value: pt._id,
        label: pt.name,
      })),
      searchable: true,
      placeholder: t("filters.placeholders.selectAuthorizationType"),
    },
    {
      key: "legalFramework",
      label: t("filters.legalFramework"),
      icon: <Scale className="h-4 w-4" />,
      type: "select",
      options: legalFrameworks.map((lf) => ({
        value: lf._id,
        label: lf.name,
      })),
      searchable: true,
      placeholder: t("filters.placeholders.selectLegalFramework"),
    },
    {
      key: "caseStatus",
      label: t("filters.caseStatus"),
      icon: <Activity className="h-4 w-4" />,
      type: "select",
      options: caseStatuses.map((cs) => ({
        value: cs._id,
        label: locale === "en" && cs.nameEn ? cs.nameEn : cs.name,
      })),
      searchable: true,
      placeholder: t("filters.placeholders.selectCaseStatus"),
    },
    {
      key: "dateProcess",
      label: t("filters.requestDate"),
      icon: <Calendar className="h-4 w-4" />,
      type: "date",
      placeholder: t("filters.placeholders.selectDate"),
    },
  ], [t, locale, applicantOptions, processTypes, legalFrameworks, caseStatuses])

  // i18n configuration for the Filters component (partial config)
  const filterI18n = useMemo(() => ({
    addFilter: t("filters.addFilter"),
    searchFields: t("filters.searchFields"),
    noFieldsFound: t("filters.noFieldsFound"),
    noResultsFound: t("filters.noResultsFound"),
    select: t("filters.select"),
  }), [t])

  // Apply filters to individual processes
  const filteredProcesses = useMemo(() => {
    let result = individualProcesses

    // Apply candidate multi-select filter first
    if (selectedCandidates.length > 0) {
      result = result.filter((process) => {
        const personId = process.person?._id
        return personId && selectedCandidates.includes(personId)
      })
    }

    // Apply advanced filters (hidden for now)
    if (filters.length === 0) return result

    return result.filter((process) => {
      return filters.every((filter) => {
        const { field, operator, values } = filter

        if (!values || values.length === 0) return true

        switch (field) {
          case "candidate": {
            const candidateName = process.person?.fullName?.toLowerCase() || ""
            const filterValue = values[0]?.toLowerCase() || ""

            switch (operator) {
              case "contains":
                return candidateName.includes(filterValue)
              case "not_contains":
                return !candidateName.includes(filterValue)
              case "starts_with":
                return candidateName.startsWith(filterValue)
              case "ends_with":
                return candidateName.endsWith(filterValue)
              case "is":
                return candidateName === filterValue
              case "empty":
                return !candidateName
              case "not_empty":
                return !!candidateName
              default:
                return candidateName.includes(filterValue)
            }
          }

          case "applicant": {
            const applicantId = process.companyApplicant?._id

            switch (operator) {
              case "is":
                return values.includes(applicantId || "")
              case "is_not":
                return !values.includes(applicantId || "")
              case "empty":
                return !applicantId
              case "not_empty":
                return !!applicantId
              default:
                return values.includes(applicantId || "")
            }
          }

          case "processType": {
            const processTypeId = process.processType?._id

            switch (operator) {
              case "is":
                return values.includes(processTypeId || "")
              case "is_not":
                return !values.includes(processTypeId || "")
              case "empty":
                return !processTypeId
              case "not_empty":
                return !!processTypeId
              default:
                return values.includes(processTypeId || "")
            }
          }

          case "legalFramework": {
            const legalFrameworkId = process.legalFramework?._id

            switch (operator) {
              case "is":
                return values.includes(legalFrameworkId || "")
              case "is_not":
                return !values.includes(legalFrameworkId || "")
              case "empty":
                return !legalFrameworkId
              case "not_empty":
                return !!legalFrameworkId
              default:
                return values.includes(legalFrameworkId || "")
            }
          }

          case "caseStatus": {
            const caseStatusId = process.caseStatus?._id

            switch (operator) {
              case "is":
                return values.includes(caseStatusId || "")
              case "is_not":
                return !values.includes(caseStatusId || "")
              case "empty":
                return !caseStatusId
              case "not_empty":
                return !!caseStatusId
              default:
                return values.includes(caseStatusId || "")
            }
          }

          case "dateProcess": {
            const dateProcess = (process as any).dateProcess
            if (!dateProcess) {
              return operator === "empty"
            }

            const processDate = new Date(dateProcess)
            const filterDate = values[0] ? new Date(values[0]) : null
            const filterDate2 = values[1] ? new Date(values[1]) : null

            switch (operator) {
              case "is":
                return filterDate && processDate.toDateString() === filterDate.toDateString()
              case "is_not":
                return filterDate && processDate.toDateString() !== filterDate.toDateString()
              case "before":
                return filterDate && processDate < filterDate
              case "after":
                return filterDate && processDate > filterDate
              case "between":
                return filterDate && filterDate2 && processDate >= filterDate && processDate <= filterDate2
              case "not_between":
                return filterDate && filterDate2 && (processDate < filterDate || processDate > filterDate2)
              case "empty":
                return !dateProcess
              case "not_empty":
                return !!dateProcess
              default:
                return true
            }
          }

          default:
            return true
        }
      })
    })
  }, [individualProcesses, filters, selectedCandidates])

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('processManagement') },
    { label: tBreadcrumbs('individualProcesses') }
  ]

  const handleCreate = () => {
    setSelectedProcessId(undefined)
    setIsDialogOpen(true)
  }

  const handleView = (id: Id<"individualProcesses">) => {
    const process = individualProcesses.find(p => p._id === id)
    if (process?.collectiveProcess) {
      // Navigate to collective process if this is part of a collective
      router.push(`/collective-processes/${process.collectiveProcess._id}`)
    } else {
      // Navigate to individual process view (current behavior)
      router.push(`/individual-processes/${id}`)
    }
  }

  const handleEdit = (id: Id<"individualProcesses">) => {
    setSelectedProcessId(id)
    setIsDialogOpen(true)
  }

  const handleSuccess = () => {
    setIsDialogOpen(false)
    setSelectedProcessId(undefined)
  }

  const handleDelete = async (id: Id<"individualProcesses">) => {
    await deleteIndividualProcess({ id })
  }

  const handleFillFields = (individualProcessId: Id<"individualProcesses">, statusId: Id<"individualProcessStatuses">) => {
    setSelectedProcessId(individualProcessId)
    setSelectedStatusId(statusId)
    setFillFieldsModalOpen(true)
  }

  const handleCreateFromExisting = (id: Id<"individualProcesses">) => {
    setSourceProcessId(id)
    setCreateFromDialogOpen(true)
  }

  const handleConfirmCreateFromExisting = async () => {
    if (!sourceProcessId) return

    try {
      const newProcessId = await createFromExisting({ sourceProcessId })
      setCreateFromDialogOpen(false)
      setSourceProcessId(undefined)

      // Open the newly created process in edit mode
      if (newProcessId) {
        router.push(`/individual-processes/${newProcessId}/edit`)
      }
    } catch (error) {
      console.error("Error creating process from existing:", error)
      // Keep dialog open on error so user can try again
    }
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
            <ExportDataDialog defaultExportType="individualProcesses" />
            <Button onClick={() => router.push('/process-wizard')}>
              <Plus className="mr-2 h-4 w-4" />
              {tCommon('create')}
            </Button>
          </div>
        </div>

{/* Hidden: Advanced filters - preserved for future use
        <Filters
          filters={filters}
          fields={filterFields}
          onChange={setFilters}
          variant="solid"
          i18n={filterI18n}
        />
        */}

        <IndividualProcessesTable
          individualProcesses={filteredProcesses}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onFillFields={handleFillFields}
          onCreateFromExisting={handleCreateFromExisting}
          onRowClick={handleView}
          candidateOptions={candidateOptions}
          selectedCandidates={selectedCandidates}
          onCandidateFilterChange={setSelectedCandidates}
          isRnmModeActive={isRnmModeActive}
          onRnmModeToggle={() => setIsRnmModeActive(!isRnmModeActive)}
        />

        <IndividualProcessFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          individualProcessId={selectedProcessId}
          onSuccess={handleSuccess}
        />

        {selectedProcessId && selectedStatusId && (
          <FillFieldsModal
            individualProcessId={selectedProcessId}
            statusId={selectedStatusId}
            open={fillFieldsModalOpen}
            onOpenChange={setFillFieldsModalOpen}
          />
        )}

        {sourceProcessId && (
          <CreateFromExistingDialog
            open={createFromDialogOpen}
            onOpenChange={setCreateFromDialogOpen}
            onConfirm={handleConfirmCreateFromExisting}
            sourceProcess={individualProcesses.find(p => p._id === sourceProcessId)}
          />
        )}
      </div>
    </>
  )
}
