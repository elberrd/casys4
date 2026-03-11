"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations, useLocale } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  IndividualProcessesTable,
  type IndividualProcessesExportSnapshot,
} from "@/components/individual-processes/individual-processes-table"
import { IndividualProcessFormDialog } from "@/components/individual-processes/individual-process-form-dialog"
import { FillFieldsModal } from "@/components/individual-processes/fill-fields-modal"
import { CreateFromExistingDialog } from "@/components/individual-processes/create-from-existing-dialog"
import { Button } from "@/components/ui/button"
import { Filters, type Filter, type FilterFieldConfig } from "@/components/ui/filters"
import { Plus, User, Building2, FileText, Scale, Activity, Calendar, Filter as FilterIcon, FileSpreadsheet, X, Check, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Id } from "@/convex/_generated/dataModel"
import type { VisibilityState } from "@tanstack/react-table"
import { ExcelExportDialog } from "@/components/ui/excel-export-dialog"
import { useRouter } from "next/navigation"
import { SaveFilterSheet } from "@/components/saved-filters/save-filter-sheet"
import { SavedFiltersList } from "@/components/saved-filters/saved-filters-list"
import { SaveFilterButton } from "@/components/saved-filters/save-filter-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { FixedActionButtons } from "@/components/fixed-action-buttons"
import { getFullName } from "@/lib/utils/person-names"

export function IndividualProcessesClient() {
  const userProfile = useQuery(api.userProfiles.getCurrentUser)
  const isClient = userProfile?.role === "client"
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
  const [selectedUserApplicants, setSelectedUserApplicants] = useState<string[]>([])
  const [selectedProgressStatuses, setSelectedProgressStatuses] = useState<string[]>([])
  const [selectedAuthorizationTypes, setSelectedAuthorizationTypes] = useState<string[]>([])
  const [selectedLegalFrameworks, setSelectedLegalFrameworks] = useState<string[]>([])
  const [isRnmModeActive, setIsRnmModeActive] = useState(false)
  const [isUrgentModeActive, setIsUrgentModeActive] = useState(false)
  const [isQualExpProfModeActive, setIsQualExpProfModeActive] = useState(false)
  const [isExigenciaModeActive, setIsExigenciaModeActive] = useState(false)

  // For client users, activate "Exigência" filter by default on mount
  const [clientDefaultApplied, setClientDefaultApplied] = useState(false)
  useEffect(() => {
    if (isClient && !clientDefaultApplied) {
      setIsExigenciaModeActive(true)
      setClientDefaultApplied(true)
    }
  }, [isClient, clientDefaultApplied])
  const [isSaveFilterSheetOpen, setIsSaveFilterSheetOpen] = useState(false)
  const [excelSnapshot, setExcelSnapshot] = useState<IndividualProcessesExportSnapshot>({
    columns: [],
    data: [],
    grouped: false,
  })

  // Column visibility state - synced with saved views
  const initialColumnVisibility: VisibilityState = {
    filledFields: false,
    rnmDeadline: false,
    protocolNumber: false,
    processStatus: true,
    userApplicant_fullName: false,
    qualification: false,
    professionalExperience: false,
    notes: true,
  }
  const initialColumnVisibilityRef = useRef<VisibilityState>(initialColumnVisibility)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility)
  const [selectedFilterName, setSelectedFilterName] = useState<string | null>(null)
  const [editingFilter, setEditingFilter] = useState<{
    _id: Id<"savedFilters">
    name: string
    filterType: "individualProcesses" | "collectiveProcesses"
    filterCriteria: any
  } | null>(null)
  const [isEditingView, setIsEditingView] = useState(false)
  const [editingViewName, setEditingViewName] = useState("")

  const individualProcesses = useQuery(api.individualProcesses.list, {}) ?? []
  const deleteIndividualProcess = useMutation(api.individualProcesses.remove)
  const createFromExisting = useMutation(api.individualProcesses.createFromExisting)
  const updateSavedFilter = useMutation(api.savedFilters.update)

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
        uniqueCandidates.set(process.person._id, getFullName(process.person))
      }
    })
    return Array.from(uniqueCandidates.entries())
      .map(([id, name]) => ({
        value: id,
        label: name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [individualProcesses])

  // Get unique user applicants (solicitantes) from the individual processes data
  const userApplicantOptions = useMemo(() => {
    const uniqueUserApplicants = new Map<string, string>()
    individualProcesses.forEach((process) => {
      if (process.userApplicant) {
        uniqueUserApplicants.set(process.userApplicant._id, process.userApplicant.fullName)
      }
    })
    return Array.from(uniqueUserApplicants.entries())
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

  // Get authorization type options from process types
  const authorizationTypeOptions = useMemo(() => {
    return processTypes
      .map((pt) => ({
        value: pt._id,
        label: pt.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [processTypes])

  // Get legal framework options
  const legalFrameworkOptions = useMemo(() => {
    return legalFrameworks
      .map((lf) => ({
        value: lf._id,
        label: lf.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [legalFrameworks])

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
      selectedUserApplicants.length > 0 ||
      selectedProgressStatuses.length > 0 ||
      selectedAuthorizationTypes.length > 0 ||
      selectedLegalFrameworks.length > 0 ||
      isRnmModeActive ||
      isUrgentModeActive ||
      isQualExpProfModeActive ||
      isExigenciaModeActive ||
      filters.length > 0
    )
  }, [selectedCandidates, selectedApplicants, selectedUserApplicants, selectedProgressStatuses, selectedAuthorizationTypes, selectedLegalFrameworks, isRnmModeActive, isUrgentModeActive, isQualExpProfModeActive, isExigenciaModeActive, filters])

  // Clear selected filter name when all filters are cleared
  useEffect(() => {
    if (!hasActiveFilters) {
      setSelectedFilterName(null)
    }
  }, [hasActiveFilters])

  const getCurrentFilterCriteria = useCallback(() => {
    const criteria: any = {}
    if (selectedCandidates.length > 0) criteria.selectedCandidates = selectedCandidates
    if (selectedApplicants.length > 0) criteria.selectedApplicants = selectedApplicants
    if (selectedUserApplicants.length > 0) criteria.selectedUserApplicants = selectedUserApplicants
    if (selectedProgressStatuses.length > 0) criteria.selectedProgressStatuses = selectedProgressStatuses
    if (selectedAuthorizationTypes.length > 0) criteria.selectedAuthorizationTypes = selectedAuthorizationTypes
    if (selectedLegalFrameworks.length > 0) criteria.selectedLegalFrameworks = selectedLegalFrameworks
    if (isRnmModeActive) criteria.isRnmModeActive = true
    if (isUrgentModeActive) criteria.isUrgentModeActive = true
    if (isQualExpProfModeActive) criteria.isQualExpProfModeActive = true
    if (isExigenciaModeActive) criteria.isExigenciaModeActive = true
    if (filters.length > 0) criteria.advancedFilters = filters
    // Always save column visibility state
    criteria.columnVisibility = columnVisibility
    return criteria
  }, [selectedCandidates, selectedApplicants, selectedUserApplicants, selectedProgressStatuses, selectedAuthorizationTypes, selectedLegalFrameworks, isRnmModeActive, isUrgentModeActive, isQualExpProfModeActive, isExigenciaModeActive, filters, columnVisibility])

  const handleApplySavedFilter = useCallback((filterCriteria: any, filterName: string) => {
    // Clear all filters
    setSelectedCandidates([])
    setSelectedApplicants([])
    setSelectedUserApplicants([])
    setSelectedProgressStatuses([])
    setSelectedAuthorizationTypes([])
    setSelectedLegalFrameworks([])
    setIsRnmModeActive(false)
    setIsUrgentModeActive(false)
    setIsQualExpProfModeActive(false)
    setIsExigenciaModeActive(false)
    setFilters([])

    // Apply saved filter criteria
    if (filterCriteria.selectedCandidates) {
      setSelectedCandidates(filterCriteria.selectedCandidates)
    }
    if (filterCriteria.selectedApplicants) {
      setSelectedApplicants(filterCriteria.selectedApplicants)
    }
    if (filterCriteria.selectedUserApplicants) {
      setSelectedUserApplicants(filterCriteria.selectedUserApplicants)
    }
    if (filterCriteria.selectedProgressStatuses) {
      setSelectedProgressStatuses(filterCriteria.selectedProgressStatuses)
    }
    if (filterCriteria.selectedAuthorizationTypes) {
      setSelectedAuthorizationTypes(filterCriteria.selectedAuthorizationTypes)
    }
    if (filterCriteria.selectedLegalFrameworks) {
      setSelectedLegalFrameworks(filterCriteria.selectedLegalFrameworks)
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
    if (filterCriteria.isExigenciaModeActive) {
      setIsExigenciaModeActive(true)
    }
    if (filterCriteria.advancedFilters) {
      setFilters(filterCriteria.advancedFilters)
    }
    // Apply saved column visibility if present, otherwise reset to initial
    if (filterCriteria.columnVisibility) {
      setColumnVisibility(filterCriteria.columnVisibility)
    } else {
      setColumnVisibility(initialColumnVisibilityRef.current)
    }

    // Store the selected filter name
    setSelectedFilterName(filterName)

    toast.success(tSavedFilters("success.filterApplied"), {
      closeButton: true,
    })
  }, [tSavedFilters])

  const handleClearFilter = useCallback(() => {
    // Clear all filters
    setSelectedCandidates([])
    setSelectedApplicants([])
    setSelectedUserApplicants([])
    setSelectedProgressStatuses([])
    setSelectedAuthorizationTypes([])
    setSelectedLegalFrameworks([])
    setIsRnmModeActive(false)
    setIsUrgentModeActive(false)
    setIsQualExpProfModeActive(false)
    setIsExigenciaModeActive(false)
    setFilters([])
    setSelectedFilterName(null)
    // Reset column visibility to initial state
    setColumnVisibility(initialColumnVisibilityRef.current)

    toast.success(tSavedFilters("success.filterCleared"), {
      closeButton: true,
    })
  }, [tSavedFilters])

  const handleEditFilter = useCallback((filter: {
    _id: Id<"savedFilters">
    name: string
    filterType: "individualProcesses" | "collectiveProcesses"
    filterCriteria: any
  }) => {
    // Apply the filter criteria so user can see and modify them
    handleApplySavedFilter(filter.filterCriteria, filter.name)
    setEditingFilter(filter)
    setEditingViewName(filter.name)
    setIsEditingView(true)
    // Don't open the Sheet - editing is done inline
  }, [handleApplySavedFilter])

  const handleCancelEditView = useCallback(() => {
    setEditingFilter(null)
    setEditingViewName("")
    setIsEditingView(false)
  }, [])

  const handleSaveEditView = useCallback(async () => {
    if (!editingFilter || !editingViewName.trim()) return

    try {
      await updateSavedFilter({
        id: editingFilter._id,
        name: editingViewName.trim(),
        filterCriteria: getCurrentFilterCriteria(),
      })
      toast.success(tSavedFilters("success.filterUpdated"))
      setSelectedFilterName(editingViewName.trim())
      setEditingFilter(null)
      setEditingViewName("")
      setIsEditingView(false)
    } catch (error) {
      console.error("Failed to update view:", error)
      toast.error(tSavedFilters("errors.updateFailed"))
    }
  }, [editingFilter, editingViewName, getCurrentFilterCriteria, updateSavedFilter, tSavedFilters])

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

    // Apply user applicant (solicitante) multi-select filter
    if (selectedUserApplicants.length > 0) {
      result = result.filter((process) => {
        const userApplicantId = process.userApplicant?._id
        return userApplicantId && selectedUserApplicants.includes(userApplicantId)
      })
    }

    // Apply progress status multi-select filter
    if (selectedProgressStatuses.length > 0) {
      result = result.filter((process) => {
        const caseStatusId = process.caseStatus?._id
        return caseStatusId && selectedProgressStatuses.includes(caseStatusId)
      })
    }

    // Apply authorization type multi-select filter
    if (selectedAuthorizationTypes.length > 0) {
      result = result.filter((process) => {
        const processTypeId = process.processType?._id
        return processTypeId && selectedAuthorizationTypes.includes(processTypeId)
      })
    }

    // Apply legal framework multi-select filter
    if (selectedLegalFrameworks.length > 0) {
      result = result.filter((process) => {
        const legalFrameworkId = process.legalFramework?._id
        return legalFrameworkId && selectedLegalFrameworks.includes(legalFrameworkId)
      })
    }

    // Apply urgent filter
    if (isUrgentModeActive) {
      result = result.filter((process) => process.urgent === true)
    }

    // Apply exigência filter - show only processes with exigência status, sorted oldest first
    if (isExigenciaModeActive) {
      result = result.filter((process) => process.caseStatus?.code === "exigencia")
      result = [...result].sort((a, b) => {
        const dateA = a.activeStatus?.date || a.activeStatus?.changedAt || 0
        const dateB = b.activeStatus?.date || b.activeStatus?.changedAt || 0
        if (typeof dateA === 'string' && typeof dateB === 'string') {
          return dateA.localeCompare(dateB)
        }
        return Number(dateA) - Number(dateB)
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
            const candidateName = process.person ? getFullName(process.person).toLowerCase() : ""
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
  }, [individualProcesses, filters, selectedCandidates, selectedApplicants, selectedUserApplicants, selectedProgressStatuses, selectedAuthorizationTypes, selectedLegalFrameworks, isUrgentModeActive, isExigenciaModeActive])

  const handleExportSnapshotChange = useCallback(
    (snapshot: IndividualProcessesExportSnapshot) => {
      setExcelSnapshot(snapshot)
    },
    [],
  )

  const getExcelFilename = useCallback(() => {
    const parts = ["processos_individuais"]

    if (selectedCandidates.length === 1) {
      const candidate = individualProcesses.find(p => p.person?._id === selectedCandidates[0])?.person
      if (candidate) {
        parts.push(getFullName(candidate).replace(/\s+/g, "_").toLowerCase())
      }
    }

    if (isRnmModeActive) parts.push("rnm")
    if (isUrgentModeActive) parts.push("urgente")
    if (isQualExpProfModeActive) parts.push("qual_exp_prof")
    if (isExigenciaModeActive) parts.push("exigencias")

    const today = new Date().toISOString().split("T")[0]
    parts.push(today)

    return parts.join("_")
  }, [selectedCandidates, individualProcesses, isRnmModeActive, isUrgentModeActive, isQualExpProfModeActive, isExigenciaModeActive])

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

  // Memoized mode toggle handlers
  const handleRnmModeToggle = useCallback(() => {
    setIsRnmModeActive((prev) => {
      const newValue = !prev
      // If activating RNM mode, deactivate others
      if (newValue) {
        setIsUrgentModeActive(false)
        setIsQualExpProfModeActive(false)
        setIsExigenciaModeActive(false)
      }
      return newValue
    })
  }, [])

  const handleUrgentModeToggle = useCallback(() => {
    setIsUrgentModeActive((prev) => {
      const newValue = !prev
      // If activating Urgent mode, deactivate others
      if (newValue) {
        setIsRnmModeActive(false)
        setIsQualExpProfModeActive(false)
        setIsExigenciaModeActive(false)
      }
      return newValue
    })
  }, [])

  const handleQualExpProfModeToggle = useCallback(() => {
    setIsQualExpProfModeActive((prev) => {
      const newValue = !prev
      // If activating QUAL/EXP PROF mode, deactivate others
      if (newValue) {
        setIsRnmModeActive(false)
        setIsUrgentModeActive(false)
        setIsExigenciaModeActive(false)
      }
      return newValue
    })
  }, [])

  const handleExigenciaModeToggle = useCallback(() => {
    setIsExigenciaModeActive((prev) => {
      const newValue = !prev
      if (newValue) {
        setIsRnmModeActive(false)
        setIsUrgentModeActive(false)
        setIsQualExpProfModeActive(false)
      }
      return newValue
    })
  }, [])

  return (
    <>
      {/* Fixed action buttons - only for admins */}
      {!isClient && (
        <FixedActionButtons
          onCreateClick={() => router.push('/process-wizard')}
          createButtonText={tCommon('create')}
        />
      )}

      <DashboardPageHeader breadcrumbs={breadcrumbs}>
        {/* Action buttons - admin only */}
        {!isClient && (<><div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <FilterIcon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden xl:inline whitespace-nowrap max-w-32 truncate">
                  {selectedFilterName || tSavedFilters("title")}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
              <SavedFiltersList
                filterType="individualProcesses"
                onApplyFilter={handleApplySavedFilter}
                onEditFilter={handleEditFilter}
                selectedFilterName={selectedFilterName}
                editingViewId={editingFilter?._id}
                editingViewName={editingViewName}
                onEditingViewNameChange={setEditingViewName}
                onCancelEdit={handleCancelEditView}
                onSaveEdit={handleSaveEditView}
              />
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedFilterName && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClearFilter()
              }}
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <SaveFilterButton
          hasActiveFilters={hasActiveFilters}
          onClick={() => setIsSaveFilterSheetOpen(true)}
        />

        <ExcelExportDialog
          columns={excelSnapshot.columns}
          data={excelSnapshot.data}
          defaultFilename={getExcelFilename()}
          grouped={excelSnapshot.grouped}
        >
          <Button variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xl:inline whitespace-nowrap">{tExport("exportToExcel")}</span>
          </Button>
        </ExcelExportDialog>
        </>)}
      </DashboardPageHeader>
      <div className={cn(
        "flex flex-1 flex-col gap-4 p-4 pt-0 w-full max-w-full overflow-x-hidden",
        isEditingView && "ring-2 ring-blue-500 ring-inset rounded-lg bg-blue-50/30 dark:bg-blue-950/10"
      )}>
        {/* Edit Mode Banner - admin only */}
        {!isClient && isEditingView && (
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {tSavedFilters("editMode")}
              </span>
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {tSavedFilters("editModeDescription")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEditView}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                {tCommon("cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditView}
                disabled={!editingViewName.trim()}
                className="gap-1 bg-blue-600 hover:bg-blue-700"
              >
                <Check className="h-4 w-4" />
                {tSavedFilters("saveChanges")}
              </Button>
            </div>
          </div>
        )}

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
          onEdit={isClient ? undefined : handleEdit}
          onDelete={isClient ? undefined : handleDelete}
          onFillFields={isClient ? undefined : handleFillFields}
          onCreateFromExisting={isClient ? undefined : handleCreateFromExisting}
          onRowClick={handleView}
          candidateOptions={candidateOptions}
          selectedCandidates={selectedCandidates}
          onCandidateFilterChange={setSelectedCandidates}
          {...(!isClient && {
            applicantOptions,
            selectedApplicants,
            onApplicantFilterChange: setSelectedApplicants,
            userApplicantOptions,
            selectedUserApplicants,
            onUserApplicantFilterChange: setSelectedUserApplicants,
            authorizationTypeOptions,
            selectedAuthorizationTypes,
            onAuthorizationTypeFilterChange: setSelectedAuthorizationTypes,
            legalFrameworkOptions,
            selectedLegalFrameworks,
            onLegalFrameworkFilterChange: setSelectedLegalFrameworks,
            isRnmModeActive,
            onRnmModeToggle: handleRnmModeToggle,
            isUrgentModeActive,
            onUrgentModeToggle: handleUrgentModeToggle,
            isQualExpProfModeActive,
            onQualExpProfModeToggle: handleQualExpProfModeToggle,
          })}
          progressStatusOptions={progressStatusOptions}
          selectedProgressStatuses={selectedProgressStatuses}
          onProgressStatusFilterChange={setSelectedProgressStatuses}
          isExigenciaModeActive={isExigenciaModeActive}
          onExigenciaModeToggle={handleExigenciaModeToggle}
          isGroupedModeActive={selectedProgressStatuses.length >= 2}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onExportSnapshotChange={isClient ? undefined : handleExportSnapshotChange}
        />

        {!isClient && (
          <>
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

            {/* Save Filter Sheet - only for creating new views */}
            <SaveFilterSheet
              open={isSaveFilterSheetOpen}
              onOpenChange={setIsSaveFilterSheetOpen}
              filterType="individualProcesses"
              currentFilters={getCurrentFilterCriteria()}
            />
          </>
        )}
      </div>
    </>
  )
}
