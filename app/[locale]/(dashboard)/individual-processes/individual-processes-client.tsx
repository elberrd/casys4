"use client"

import { useState, useMemo, useCallback } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations, useLocale } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { IndividualProcessesTable } from "@/components/individual-processes/individual-processes-table"
import { IndividualProcessFormDialog } from "@/components/individual-processes/individual-process-form-dialog"
import { FillFieldsModal } from "@/components/individual-processes/fill-fields-modal"
import { CreateFromExistingDialog } from "@/components/individual-processes/create-from-existing-dialog"
import { Button } from "@/components/ui/button"
import { Filters, type Filter, type FilterFieldConfig } from "@/components/ui/filters"
import { Plus, User, Building2, FileText, Scale, Activity, Calendar, Filter as FilterIcon, FileSpreadsheet } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { ExcelExportDialog } from "@/components/ui/excel-export-dialog"
import type { ExcelColumnConfig, ExcelGroupConfig } from "@/lib/utils/excel-export-helpers"
import { useRouter } from "next/navigation"
import { SaveFilterSheet } from "@/components/saved-filters/save-filter-sheet"
import { SavedFiltersList } from "@/components/saved-filters/saved-filters-list"
import { SaveFilterButton } from "@/components/saved-filters/save-filter-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { FixedActionButtons } from "@/components/fixed-action-buttons"

export function IndividualProcessesClient() {
  const t = useTranslations('IndividualProcesses')
  const tCommon = useTranslations('Common')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tSavedFilters = useTranslations('SavedFilters')
  const tExport = useTranslations('Export')
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
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([])
  const [selectedProgressStatuses, setSelectedProgressStatuses] = useState<string[]>([])
  const [isRnmModeActive, setIsRnmModeActive] = useState(false)
  const [isUrgentModeActive, setIsUrgentModeActive] = useState(false)
  const [isQualExpProfModeActive, setIsQualExpProfModeActive] = useState(false)
  const [isSaveFilterSheetOpen, setIsSaveFilterSheetOpen] = useState(false)

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

  // Get progress status options from case statuses
  const progressStatusOptions = useMemo(() => {
    return caseStatuses
      .map((cs) => ({
        value: cs._id,
        label: locale === "en" && cs.nameEn ? cs.nameEn : cs.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [caseStatuses, locale])

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

  // Saved Filters functionality
  const hasActiveFilters = useMemo(() => {
    return (
      selectedCandidates.length > 0 ||
      selectedApplicants.length > 0 ||
      selectedProgressStatuses.length > 0 ||
      isRnmModeActive ||
      isUrgentModeActive ||
      isQualExpProfModeActive ||
      filters.length > 0
    )
  }, [selectedCandidates, selectedApplicants, selectedProgressStatuses, isRnmModeActive, isUrgentModeActive, isQualExpProfModeActive, filters])

  const getCurrentFilterCriteria = useCallback(() => {
    const criteria: any = {}
    if (selectedCandidates.length > 0) criteria.selectedCandidates = selectedCandidates
    if (selectedApplicants.length > 0) criteria.selectedApplicants = selectedApplicants
    if (selectedProgressStatuses.length > 0) criteria.selectedProgressStatuses = selectedProgressStatuses
    if (isRnmModeActive) criteria.isRnmModeActive = true
    if (isUrgentModeActive) criteria.isUrgentModeActive = true
    if (isQualExpProfModeActive) criteria.isQualExpProfModeActive = true
    if (filters.length > 0) criteria.advancedFilters = filters
    return criteria
  }, [selectedCandidates, selectedApplicants, selectedProgressStatuses, isRnmModeActive, isUrgentModeActive, isQualExpProfModeActive, filters])

  const handleApplySavedFilter = useCallback((filterCriteria: any) => {
    // Clear all filters
    setSelectedCandidates([])
    setSelectedApplicants([])
    setSelectedProgressStatuses([])
    setIsRnmModeActive(false)
    setIsUrgentModeActive(false)
    setIsQualExpProfModeActive(false)
    setFilters([])

    // Apply saved filter criteria
    if (filterCriteria.selectedCandidates) {
      setSelectedCandidates(filterCriteria.selectedCandidates)
    }
    if (filterCriteria.selectedApplicants) {
      setSelectedApplicants(filterCriteria.selectedApplicants)
    }
    if (filterCriteria.selectedProgressStatuses) {
      setSelectedProgressStatuses(filterCriteria.selectedProgressStatuses)
    }
    if (filterCriteria.isRnmModeActive) {
      setIsRnmModeActive(true)
    }
    if (filterCriteria.isUrgentModeActive) {
      setIsUrgentModeActive(true)
    }
    if (filterCriteria.isQualExpProfModeActive) {
      setIsQualExpProfModeActive(true)
    }
    if (filterCriteria.advancedFilters) {
      setFilters(filterCriteria.advancedFilters)
    }

    toast.success(tSavedFilters("success.filterApplied"))
  }, [tSavedFilters])

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

    // Apply applicant multi-select filter
    if (selectedApplicants.length > 0) {
      result = result.filter((process) => {
        const applicantId = process.companyApplicant?._id
        return applicantId && selectedApplicants.includes(applicantId)
      })
    }

    // Apply progress status multi-select filter
    if (selectedProgressStatuses.length > 0) {
      result = result.filter((process) => {
        const caseStatusId = process.caseStatus?._id
        return caseStatusId && selectedProgressStatuses.includes(caseStatusId)
      })
    }

    // Apply urgent filter
    if (isUrgentModeActive) {
      result = result.filter((process) => process.urgent === true)
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
  }, [individualProcesses, filters, selectedCandidates, selectedApplicants, selectedProgressStatuses, isUrgentModeActive])

  // Excel export functions (must be after filteredProcesses declaration)
  const prepareExcelColumns = useCallback((): ExcelColumnConfig[] => {
    const tIndProc = t
    const columns: ExcelColumnConfig[] = []

    // Always include these base columns
    columns.push(
      { header: tIndProc("personName"), key: "personName", width: 25 },
      { header: tIndProc("processType"), key: "processType", width: 25 }
    )

    // Protocol Number - shown in Urgent mode
    if (isUrgentModeActive) {
      columns.push({ header: tIndProc("protocol"), key: "protocolNumber", width: 18 })
    }

    // Applicant
    columns.push({ header: tIndProc("applicant"), key: "applicant", width: 25 })

    // Legal Framework
    columns.push({ header: tIndProc("legalFramework"), key: "legalFramework", width: 30 })

    // Qualification and Professional Experience - shown in QUAL/EXP PROF mode
    if (isQualExpProfModeActive) {
      columns.push(
        { header: tIndProc("qualification"), key: "qualification", width: 20 },
        { header: tIndProc("professionalExperienceSince"), key: "professionalExperience", width: 18 }
      )
    }

    // Case Status - hidden in Urgent mode when not grouped
    if (!isUrgentModeActive || selectedProgressStatuses.length >= 2) {
      columns.push({ header: tIndProc("caseStatus"), key: "caseStatus", width: 22 })
    }

    // RNM Deadline - shown in RNM mode
    if (isRnmModeActive) {
      columns.push({ header: tIndProc("rnmDeadline"), key: "rnmDeadline", width: 18 })
    }

    return columns
  }, [t, isUrgentModeActive, isQualExpProfModeActive, isRnmModeActive, selectedProgressStatuses])

  const prepareExcelData = useCallback(() => {
    const tIndProc = t
    const isGrouped = selectedProgressStatuses.length >= 2

    // Helper function to format a process row
    const formatProcessRow = (process: any) => {
      const row: any = {}

      // Person Name
      row.personName = process.person?.fullName || "-"

      // Process Type
      const processType = process.processType
      if (processType) {
        row.processType = locale === "en" && processType.nameEn ? processType.nameEn : processType.name
      } else {
        row.processType = "-"
      }

      // Protocol Number (Urgent mode)
      if (isUrgentModeActive) {
        row.protocolNumber = process.protocolNumber || "-"
      }

      // Applicant
      row.applicant = process.companyApplicant?.name || "-"

      // Legal Framework
      row.legalFramework = process.legalFramework?.name || "-"

      // Qualification and Professional Experience (QUAL/EXP PROF mode)
      if (isQualExpProfModeActive) {
        const qualification = process.qualification
        if (qualification) {
          row.qualification = tIndProc(`qualificationOptions.${qualification}` as any)
        } else {
          row.qualification = "-"
        }

        const experienceDate = process.professionalExperienceSince
        if (experienceDate) {
          const [year, month, day] = experienceDate.split("-").map(Number)
          if (year && month && day) {
            const date = new Date(year, month - 1, day)
            row.professionalExperience = date.toLocaleDateString(
              locale === "en" ? "en-US" : "pt-BR",
              { day: "2-digit", month: "2-digit", year: "numeric" }
            )
          } else {
            row.professionalExperience = "-"
          }
        } else {
          row.professionalExperience = "-"
        }
      }

      // Case Status (not shown in Urgent mode unless grouped)
      if (!isUrgentModeActive || isGrouped) {
        const caseStatus = process.caseStatus
        if (caseStatus) {
          const statusName = locale === "en" && caseStatus.nameEn ? caseStatus.nameEn : caseStatus.name
          const activeStatus = process.activeStatus
          let dateStr = ""
          if (activeStatus) {
            const displayDate = activeStatus.date || new Date(activeStatus.changedAt).toISOString().split("T")[0]
            const [year, month, day] = displayDate.split("-").map(Number)
            if (year && month && day) {
              const date = new Date(year, month - 1, day)
              dateStr = date.toLocaleDateString(
                locale === "en" ? "en-US" : "pt-BR",
                { day: "2-digit", month: "2-digit", year: "numeric" }
              )
            }
          }
          row.caseStatus = dateStr ? `${statusName} (${dateStr})` : statusName
        } else {
          row.caseStatus = "-"
        }
      }

      // RNM Deadline (RNM mode)
      if (isRnmModeActive) {
        const rnmDeadline = process.rnmDeadline
        if (rnmDeadline) {
          const [year, month, day] = rnmDeadline.split("-").map(Number)
          if (year && month && day) {
            const date = new Date(year, month - 1, day)
            row.rnmDeadline = date.toLocaleDateString(
              locale === "en" ? "en-US" : "pt-BR",
              { day: "2-digit", month: "2-digit", year: "numeric" }
            )
          } else {
            row.rnmDeadline = "-"
          }
        } else {
          row.rnmDeadline = "-"
        }
      }

      return row
    }

    if (isGrouped) {
      // Grouped export by case status
      const groups: ExcelGroupConfig[] = []

      // Get unique case statuses from filtered processes
      const statusMap = new Map<string, any[]>()

      for (const process of filteredProcesses) {
        const caseStatus = process.caseStatus
        if (!caseStatus) continue

        const statusKey = caseStatus._id
        const statusName = locale === "en" && caseStatus.nameEn ? caseStatus.nameEn : caseStatus.name

        if (!statusMap.has(statusKey)) {
          statusMap.set(statusKey, [])
        }
        statusMap.get(statusKey)!.push(process)
      }

      // Convert to groups array
      for (const [, processes] of statusMap) {
        if (processes.length === 0) continue

        const caseStatus = processes[0].caseStatus
        const groupName = locale === "en" && caseStatus.nameEn ? caseStatus.nameEn : caseStatus.name

        groups.push({
          groupName,
          rows: processes.map(formatProcessRow)
        })
      }

      return groups
    } else {
      // Non-grouped export
      return filteredProcesses.map(formatProcessRow)
    }
  }, [filteredProcesses, selectedProgressStatuses, isUrgentModeActive, isQualExpProfModeActive, isRnmModeActive, locale, t])

  const getExcelFilename = useCallback(() => {
    const parts = ["processos_individuais"]

    if (selectedCandidates.length === 1) {
      const candidate = individualProcesses.find(p => p.person?._id === selectedCandidates[0])?.person
      if (candidate) {
        parts.push(candidate.fullName.replace(/\s+/g, "_").toLowerCase())
      }
    }

    if (isRnmModeActive) parts.push("rnm")
    if (isUrgentModeActive) parts.push("urgente")
    if (isQualExpProfModeActive) parts.push("qual_exp_prof")

    const today = new Date().toISOString().split("T")[0]
    parts.push(today)

    return parts.join("_")
  }, [selectedCandidates, individualProcesses, isRnmModeActive, isUrgentModeActive, isQualExpProfModeActive])

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
      {/* Fixed action buttons - always visible in top-right corner */}
      <FixedActionButtons
        onCreateClick={() => router.push('/process-wizard')}
        createButtonText={tCommon('create')}
      />

      <DashboardPageHeader breadcrumbs={breadcrumbs}>
        {/* Action buttons - sempre visíveis, texto escondido em telas pequenas */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <FilterIcon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden xl:inline whitespace-nowrap">{tSavedFilters("title")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
            <SavedFiltersList
              filterType="individualProcesses"
              onApplyFilter={handleApplySavedFilter}
            />
          </DropdownMenuContent>
        </DropdownMenu>

        <SaveFilterButton
          hasActiveFilters={hasActiveFilters}
          onClick={() => setIsSaveFilterSheetOpen(true)}
        />

        <ExcelExportDialog
          columns={prepareExcelColumns()}
          data={prepareExcelData()}
          defaultFilename={getExcelFilename()}
          grouped={selectedProgressStatuses.length >= 2}
        >
          <Button variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xl:inline whitespace-nowrap">{tExport("exportToExcel")}</span>
          </Button>
        </ExcelExportDialog>
      </DashboardPageHeader>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 w-full max-w-full overflow-x-hidden">
        {/* Page title and description */}
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
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
          applicantOptions={applicantOptions}
          selectedApplicants={selectedApplicants}
          onApplicantFilterChange={setSelectedApplicants}
          progressStatusOptions={progressStatusOptions}
          selectedProgressStatuses={selectedProgressStatuses}
          onProgressStatusFilterChange={setSelectedProgressStatuses}
          isRnmModeActive={isRnmModeActive}
          onRnmModeToggle={() => {
            // If activating RNM mode, deactivate others
            if (!isRnmModeActive) {
              setIsUrgentModeActive(false)
              setIsQualExpProfModeActive(false)
            }
            setIsRnmModeActive(!isRnmModeActive)
          }}
          isUrgentModeActive={isUrgentModeActive}
          onUrgentModeToggle={() => {
            // If activating Urgent mode, deactivate others
            if (!isUrgentModeActive) {
              setIsRnmModeActive(false)
              setIsQualExpProfModeActive(false)
            }
            setIsUrgentModeActive(!isUrgentModeActive)
          }}
          isQualExpProfModeActive={isQualExpProfModeActive}
          onQualExpProfModeToggle={() => {
            // If activating QUAL/EXP PROF mode, deactivate others
            if (!isQualExpProfModeActive) {
              setIsRnmModeActive(false)
              setIsUrgentModeActive(false)
            }
            setIsQualExpProfModeActive(!isQualExpProfModeActive)
          }}
          isGroupedModeActive={selectedProgressStatuses.length >= 2}
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

        {/* Save Filter Sheet */}
        <SaveFilterSheet
          open={isSaveFilterSheetOpen}
          onOpenChange={setIsSaveFilterSheetOpen}
          filterType="individualProcesses"
          currentFilters={getCurrentFilterCriteria()}
          onSaveSuccess={() => {
            toast.success(tSavedFilters("success.filterSaved"))
          }}
        />
      </div>
    </>
  )
}
