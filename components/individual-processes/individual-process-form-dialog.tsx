"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { useTranslations, useLocale } from "next-intl"
import {
  individualProcessSchema,
  IndividualProcessFormData,
} from "@/lib/validations/individualProcesses"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { StatusBadge } from "@/components/ui/status-badge"
import { IndividualProcessStatusesSubtable } from "./individual-process-statuses-subtable"
import { InitialStatusForm } from "./initial-status-form"
import { Separator } from "@/components/ui/separator"
import { CompanyApplicantSelector } from "./company-applicant-selector"
import { UserApplicantSelector } from "./user-applicant-selector"
import { PassportSelector } from "./passport-selector"
import { getCountryCurrencyOptions, getCurrencySymbol } from "@/lib/constants/currencies"
import { FormDescription } from "@/components/ui/form"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Calculator, Loader2 } from "lucide-react"
import { fetchExchangeRate } from "@/lib/api/exchange-rate"

interface IndividualProcessFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  individualProcessId?: Id<"individualProcesses">
  onSuccess?: () => void
}

export function IndividualProcessFormDialog({
  open,
  onOpenChange,
  individualProcessId,
  onSuccess,
}: IndividualProcessFormDialogProps) {
  const t = useTranslations("IndividualProcesses")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const { toast } = useToast()
  const userProfile = useQuery(api.userProfiles.getCurrentUser)

  // State for initial status when creating new process
  const [initialStatus, setInitialStatus] = useState<{
    caseStatusId: Id<"caseStatuses">;
    date: string;
  } | null>(null)

  // State for exchange rate loading
  const [isLoadingExchangeRate, setIsLoadingExchangeRate] = useState(false)

  const individualProcess = useQuery(
    api.individualProcesses.get,
    individualProcessId ? { id: individualProcessId } : "skip"
  )

  const collectiveProcesses = useQuery(api.collectiveProcesses.list, {}) ?? []
  const people = useQuery(api.people.search, { query: "" }) ?? []
  const processTypes = useQuery(api.processTypes.listActive, {}) ?? []
  const cboCodes = useQuery(api.cboCodes.list, {}) ?? []
  const caseStatuses = useQuery(api.caseStatuses.listActive, {}) ?? []
  const consulates = useQuery(api.consulates.list, {}) ?? []

  const createIndividualProcess = useMutation(api.individualProcesses.create)
  const updateIndividualProcess = useMutation(api.individualProcesses.update)

  const form = useForm<IndividualProcessFormData>({
    resolver: zodResolver(individualProcessSchema) as any,
    defaultValues: {
      collectiveProcessId: "" as Id<"collectiveProcesses">,
      dateProcess: new Date().toISOString().split('T')[0], // Pre-fill with today's date
      personId: "" as Id<"people">,
      passportId: "",
      applicantId: "", // DEPRECATED: Kept for backward compatibility
      companyApplicantId: "",
      userApplicantId: "",
      consulateId: "",
      caseStatusId: "" as Id<"caseStatuses">,
      status: "", // DEPRECATED: Kept for backward compatibility
      processTypeId: "",
      legalFrameworkId: "" as Id<"legalFrameworks">,
      cboId: "",
      qualification: "",
      professionalExperienceSince: "",
      mreOfficeNumber: "",
      douNumber: "",
      douSection: "",
      douPage: "",
      douDate: "",
      protocolNumber: "",
      rnmNumber: "",
      rnmDeadline: "",
      appointmentDateTime: "",
      deadlineDate: "",
      deadlineUnit: "",
      deadlineQuantity: undefined,
      deadlineSpecificDate: "",
      lastSalaryCurrency: "USD",
      lastSalaryAmount: undefined,
      exchangeRateToBRL: undefined,
      salaryInBRL: undefined,
      monthlyAmountToReceive: undefined,
      isActive: true, // DEPRECATED: Use processStatus instead
      processStatus: "Atual" as const,
    },
  })

  // Unsaved changes protection
  const {
    showUnsavedDialog,
    setShowUnsavedDialog,
    handleOpenChange,
    handleConfirmClose,
    handleCancelClose,
  } = useUnsavedChanges({
    formState: form.formState,
    onConfirmedClose: () => {
      form.reset()
      onOpenChange(false)
    },
    isSubmitting: form.formState.isSubmitting,
  })

  // Watch authorization type for cascading legal framework filtering
  const selectedProcessTypeId = form.watch("processTypeId")

  // Watch deadline unit for conditional field display
  const selectedDeadlineUnit = form.watch("deadlineUnit")

  // Watch salary fields for currency conversion
  const selectedCurrency = form.watch("lastSalaryCurrency")
  const lastSalaryAmount = form.watch("lastSalaryAmount")
  const exchangeRate = form.watch("exchangeRateToBRL")

  // Check if conversion can be calculated
  const canCalculateConversion = Boolean(
    selectedCurrency &&
    lastSalaryAmount &&
    lastSalaryAmount > 0 &&
    exchangeRate &&
    exchangeRate > 0
  )

  // Handle conversion calculation
  const handleCalculateConversion = () => {
    if (canCalculateConversion) {
      const converted = lastSalaryAmount! * exchangeRate!
      const convertedValue = Number(converted.toFixed(2))
      form.setValue("salaryInBRL", convertedValue)
      toast({
        title: t("conversionCalculated"),
      })
    }
  }

  // Get filtered legal frameworks based on selected authorization type
  const filteredLegalFrameworks = useQuery(
    api.processTypes.getLegalFrameworks,
    selectedProcessTypeId && selectedProcessTypeId !== ""
      ? { processTypeId: selectedProcessTypeId as Id<"processTypes"> }
      : "skip"
  )

  // Fallback to all legal frameworks if no authorization type selected
  const allLegalFrameworks = useQuery(api.legalFrameworks.listActive, {})

  // Use filtered or all legal frameworks
  const legalFrameworks = selectedProcessTypeId && selectedProcessTypeId !== ""
    ? (filteredLegalFrameworks ?? [])
    : (allLegalFrameworks ?? [])

  // Reset form when individual process data loads
  useEffect(() => {
    if (individualProcess) {
      form.reset({
        collectiveProcessId: individualProcess.collectiveProcessId,
        dateProcess: individualProcess.dateProcess ?? "",
        personId: individualProcess.personId,
        passportId: individualProcess.passportId ?? "",
        applicantId: individualProcess.applicantId ?? "", // DEPRECATED
        companyApplicantId: individualProcess.companyApplicantId ?? "",
        userApplicantId: individualProcess.userApplicantId ?? "",
        consulateId: individualProcess.consulateId ?? "",
        caseStatusId: individualProcess.caseStatusId ?? ("" as Id<"caseStatuses">),
        status: individualProcess.status ?? "", // DEPRECATED: Kept for backward compatibility
        processTypeId: individualProcess.processTypeId ?? "",
        legalFrameworkId: individualProcess.legalFrameworkId,
        cboId: individualProcess.cboId ?? "",
        qualification: (individualProcess.qualification ?? "") as "" | "medio" | "tecnico" | "superior" | "naoPossui",
        professionalExperienceSince: individualProcess.professionalExperienceSince ?? "",
        mreOfficeNumber: individualProcess.mreOfficeNumber ?? "",
        douNumber: individualProcess.douNumber ?? "",
        douSection: individualProcess.douSection ?? "",
        douPage: individualProcess.douPage ?? "",
        douDate: individualProcess.douDate ?? "",
        protocolNumber: individualProcess.protocolNumber ?? "",
        rnmNumber: individualProcess.rnmNumber ?? "",
        rnmDeadline: individualProcess.rnmDeadline ?? "",
        appointmentDateTime: individualProcess.appointmentDateTime ?? "",
        deadlineDate: individualProcess.deadlineDate ?? "",
        deadlineUnit: individualProcess.deadlineUnit ?? "",
        deadlineQuantity: individualProcess.deadlineQuantity,
        deadlineSpecificDate: individualProcess.deadlineSpecificDate ?? "",
        lastSalaryCurrency: individualProcess.lastSalaryCurrency ?? "USD",
        lastSalaryAmount: individualProcess.lastSalaryAmount,
        exchangeRateToBRL: individualProcess.exchangeRateToBRL,
        salaryInBRL: individualProcess.salaryInBRL,
        monthlyAmountToReceive: individualProcess.monthlyAmountToReceive,
        isActive: individualProcess.isActive,
        processStatus: individualProcess.processStatus ?? (individualProcess.isActive === false ? "Anterior" : "Atual"),
      })
    } else if (!individualProcessId) {
      form.reset({
        collectiveProcessId: "" as Id<"collectiveProcesses">,
        dateProcess: new Date().toISOString().split('T')[0], // Pre-fill with today's date
        personId: "" as Id<"people">,
        passportId: "",
        applicantId: "", // DEPRECATED
        companyApplicantId: "",
        userApplicantId: "",
        consulateId: "",
        caseStatusId: "" as Id<"caseStatuses">,
        status: "", // DEPRECATED: Kept for backward compatibility
        processTypeId: "",
        legalFrameworkId: "" as Id<"legalFrameworks">,
        cboId: "",
        qualification: "",
        professionalExperienceSince: "",
        mreOfficeNumber: "",
        douNumber: "",
        douSection: "",
        douPage: "",
        douDate: "",
        protocolNumber: "",
        rnmNumber: "",
        rnmDeadline: "",
        appointmentDateTime: "",
        deadlineDate: "",
        deadlineUnit: "",
        deadlineQuantity: undefined,
        deadlineSpecificDate: "",
        lastSalaryCurrency: "USD",
        lastSalaryAmount: undefined,
        exchangeRateToBRL: undefined,
        salaryInBRL: undefined,
        monthlyAmountToReceive: undefined,
        isActive: true,
        processStatus: "Atual" as const,
      })
    }
  }, [individualProcess, individualProcessId, form])

  // Clear legal framework when authorization type changes
  useEffect(() => {
    // Clear legal framework when authorization type changes or is cleared
    const currentLegalFrameworkId = form.getValues("legalFrameworkId")
    if (currentLegalFrameworkId) {
      // Reset legal framework when authorization type changes
      form.setValue("legalFrameworkId", "" as Id<"legalFrameworks">)
    }
  }, [selectedProcessTypeId])

  // Fetch exchange rate when currency changes
  useEffect(() => {
    const fetchRate = async () => {
      if (!selectedCurrency || selectedCurrency === "BRL") {
        return
      }

      setIsLoadingExchangeRate(true)
      try {
        const rate = await fetchExchangeRate(selectedCurrency)
        if (rate !== null) {
          form.setValue("exchangeRateToBRL", rate)
          toast({
            title: t("exchangeRateUpdated") || "Taxa de câmbio atualizada",
            description: `1 ${selectedCurrency} = R$ ${rate.toFixed(4)}`,
          })
        } else {
          // Não conseguiu buscar a taxa
          toast({
            title: "Não foi possível buscar a taxa de câmbio",
            description: `Por favor, insira a taxa manualmente para ${selectedCurrency}`,
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching exchange rate:", error)
        toast({
          title: "Erro ao buscar taxa de câmbio",
          description: "Por favor, insira a taxa manualmente",
          variant: "destructive",
        })
      } finally {
        setIsLoadingExchangeRate(false)
      }
    }

    fetchRate()
  }, [selectedCurrency, form, toast, t])

  const onSubmit = async (data: IndividualProcessFormData) => {
    try {
      // Clean optional fields - convert empty strings to undefined
      const submitData = {
        ...data,
        collectiveProcessId: data.collectiveProcessId || undefined,
        dateProcess: data.dateProcess || undefined,
        passportId: data.passportId || undefined,
        applicantId: data.applicantId || undefined, // DEPRECATED
        companyApplicantId: data.companyApplicantId || undefined,
        userApplicantId: data.userApplicantId || undefined,
        consulateId: data.consulateId || undefined,
        caseStatusId: data.caseStatusId,
        status: data.status || undefined, // DEPRECATED: Kept for backward compatibility
        processTypeId: data.processTypeId || undefined,
        legalFrameworkId: data.legalFrameworkId || undefined,
        cboId: data.cboId || undefined,
        qualification: data.qualification || undefined,
        professionalExperienceSince: data.professionalExperienceSince || undefined,
        mreOfficeNumber: data.mreOfficeNumber || undefined,
        douNumber: data.douNumber || undefined,
        douSection: data.douSection || undefined,
        douPage: data.douPage || undefined,
        douDate: data.douDate || undefined,
        protocolNumber: data.protocolNumber || undefined,
        rnmNumber: data.rnmNumber || undefined,
        rnmDeadline: data.rnmDeadline || undefined,
        appointmentDateTime: data.appointmentDateTime || undefined,
        deadlineDate: data.deadlineDate || undefined,
        lastSalaryCurrency: data.lastSalaryCurrency || undefined,
        lastSalaryAmount: data.lastSalaryAmount,
        exchangeRateToBRL: data.exchangeRateToBRL,
        salaryInBRL: data.salaryInBRL,
        monthlyAmountToReceive: data.monthlyAmountToReceive,
      }

      if (individualProcessId) {
        // Remove personId from submit data when updating (can't change person of existing process)
        const { personId, ...updateData } = submitData
        await updateIndividualProcess({ id: individualProcessId, ...updateData })
        toast({
          title: t("updatedSuccess"),
        })
      } else {
        await createIndividualProcess(submitData)
        toast({
          title: t("createdSuccess"),
        })
      }
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: individualProcessId ? t("errorUpdate") : t("errorCreate"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const collectiveProcessOptions = collectiveProcesses.map((process) => ({
    value: process._id,
    label: process.referenceNumber,
  }))

  const peopleOptions = people.map((person) => ({
    value: person._id,
    label: person.fullName,
  }))

  const processTypeOptions = processTypes.map((processType) => ({
    value: processType._id,
    label: processType.name,
  }))

  const legalFrameworkOptions = legalFrameworks
    .filter((framework): framework is NonNullable<typeof framework> => framework !== null)
    .map((framework) => ({
      value: framework._id,
      label: framework.name,
    }))

  const cboOptions = cboCodes.map((cbo) => ({
    value: cbo._id,
    label: `${cbo.code} - ${cbo.title}`,
  }))

  // Build case status options from active case statuses
  const caseStatusOptions = caseStatuses.map((status) => ({
    value: status._id,
    label: locale === "en" && status.nameEn ? status.nameEn : status.name,
    color: status.color,
    category: status.category,
  }))

  // Build consulate options with city and country info
  const consulateOptions = consulates.map((consulate) => {
    const cityName = consulate.city?.name ?? ""
    const stateName = consulate.state?.name ?? ""
    const countryName = consulate.country?.name ?? ""
    const label = [cityName, stateName, countryName].filter(Boolean).join(", ") || consulate._id
    return {
      value: consulate._id,
      label,
    }
  })

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {individualProcessId ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {individualProcessId
              ? "Edit the individual process information below"
              : "Fill in the information to create a new individual process"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Required Fields Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("requiredFields")}</h3>

              <FormField
                control={form.control}
                name="dateProcess"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dateProcess")}</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="collectiveProcessId"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormLabel>{t("collectiveProcess")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={collectiveProcessOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t("selectCollectiveProcess")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userApplicantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("userApplicant")}</FormLabel>
                    <FormControl>
                      <UserApplicantSelector
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="processTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("processType")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={processTypeOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t("selectProcessType")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legalFrameworkId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("legalFramework")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={legalFrameworkOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t("selectLegalFramework")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("person")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={peopleOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t("selectPerson")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("qualification")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectQualification")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="medio">
                            {t("qualificationOptions.medio")}
                          </SelectItem>
                          <SelectItem value="tecnico">
                            {t("qualificationOptions.tecnico")}
                          </SelectItem>
                          <SelectItem value="superior">
                            {t("qualificationOptions.superior")}
                          </SelectItem>
                          <SelectItem value="naoPossui">
                            {t("qualificationOptions.naoPossui")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="professionalExperienceSince"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("professionalExperienceSince")}</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t("professionalExperienceSinceLabel")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="companyApplicantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("companyApplicant")}</FormLabel>
                    <FormControl>
                      <CompanyApplicantSelector
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consulateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("consulate")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={consulateOptions}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder={t("selectConsulate")}
                        searchPlaceholder={t("searchConsulates")}
                        emptyText={t("noConsulatesFound")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passportId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("passport")}</FormLabel>
                    <FormControl>
                      <PassportSelector
                        personId={form.watch("personId")}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Salary Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("salaryInformation")}</h3>

              {/* Currency and Amount Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lastSalaryCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lastSalaryCurrency")}</FormLabel>
                      <FormControl>
                        <Combobox
                          options={getCountryCurrencyOptions(locale).map(option => ({
                            value: option.value,
                            label: option.label,
                          }))}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder={t("selectCountryForCurrency")}
                          searchPlaceholder={t("searchCountry")}
                          emptyText={t("noCountryFound")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastSalaryAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lastSalaryAmount")}</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          placeholder={t("enterSalaryAmount")}
                          value={field.value}
                          onChange={field.onChange}
                          currencySymbol={selectedCurrency ? getCurrencySymbol(selectedCurrency) : undefined}
                          currencyCode={selectedCurrency || "USD"}
                          disabled={!selectedCurrency}
                        />
                      </FormControl>
                      {!selectedCurrency && (
                        <FormDescription className="text-muted-foreground text-xs">
                          {t("selectCurrencyFirst")}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Exchange Rate and Calculated Value Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="exchangeRateToBRL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        {t("exchangeRateToBRL")}
                        {isLoadingExchangeRate && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </FormLabel>
                      <FormControl>
                        <CurrencyInput
                          placeholder={t("enterExchangeRate")}
                          value={field.value}
                          onChange={field.onChange}
                          currencySymbol="R$"
                          currencyCode="BRL"
                          disabled={isLoadingExchangeRate}
                        />
                      </FormControl>
                      {selectedCurrency && (
                        <FormDescription className="text-xs text-muted-foreground">
                          {isLoadingExchangeRate
                            ? "Buscando cotação..."
                            : `1 ${getCurrencySymbol(selectedCurrency)} = X R$`
                          }
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salaryInBRL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("salaryInBRL")}</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            currencySymbol="R$"
                            currencyCode="BRL"
                            disabled
                            className="bg-muted flex-1"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          disabled={!canCalculateConversion}
                          onClick={handleCalculateConversion}
                          className="h-10 w-10 shrink-0"
                          title={t("calculateConversion")}
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Monthly Amount to Receive */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyAmountToReceive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("monthlyAmountToReceive")}</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          placeholder={t("enterMonthlyAmount")}
                          value={field.value}
                          onChange={field.onChange}
                          currencySymbol="R$"
                          currencyCode="BRL"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        {t("monthlyAmountDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Deadline Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("deadlineDate")}</h3>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="deadlineUnit"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{t("deadlineUnit")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("selectDeadlineUnit")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="years">{t("deadlineUnits.years")}</SelectItem>
                          <SelectItem value="months">{t("deadlineUnits.months")}</SelectItem>
                          <SelectItem value="days">{t("deadlineUnits.days")}</SelectItem>
                          <SelectItem value="prefixed">{t("deadlineUnits.prefixed")}</SelectItem>
                          <SelectItem value="indeterminate">{t("deadlineUnits.indeterminate")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(selectedDeadlineUnit === "days" || selectedDeadlineUnit === "months" || selectedDeadlineUnit === "years") && (
                  <FormField
                    control={form.control}
                    name="deadlineQuantity"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{t("deadlineQuantity")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t("enterDeadlineQuantity")}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedDeadlineUnit === "prefixed" && (
                  <FormField
                    control={form.control}
                    name="deadlineSpecificDate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{t("deadlineSpecificDate")}</FormLabel>
                        <FormControl>
                          <DatePicker value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Status Section - Show Initial Status Form when creating, Subtable when editing */}
            <div className="space-y-4">
              {!individualProcessId ? (
                <InitialStatusForm
                  onStatusChange={(caseStatusId, date) => {
                    setInitialStatus({ caseStatusId, date })
                    // Also update the form's caseStatusId for backend compatibility
                    form.setValue("caseStatusId", caseStatusId)
                  }}
                  defaultDate={new Date().toISOString().split('T')[0]}
                />
              ) : (
                userProfile && (
                  <>
                    <Separator />
                    <IndividualProcessStatusesSubtable
                      individualProcessId={individualProcessId}
                      userRole={userProfile.role}
                    />
                  </>
                )
              )}
            </div>

            {/* CBO Code Field */}
            <FormField
              control={form.control}
              name="cboId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cbo")}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={cboOptions}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder={t("selectCbo")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Fields Section */}
            {false && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("optionalFields")}</h3>

              <FormField
                control={form.control}
                name="cboId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("cbo")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={cboOptions}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder={t("selectCbo")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mreOfficeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mreOfficeNumber")}</FormLabel>
                    <FormControl>
                      <Input placeholder="MRE-123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadlineDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("deadlineDate")}</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("appointmentDateTime")}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            )}

            {/* Government Protocol Information Section */}
            {false && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("governmentProtocolInformation")}</h3>

              <FormField
                control={form.control}
                name="protocolNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("protocolNumber")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("protocolNumberPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            )}

            {/* DOU Information Section */}
            {false && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("douInformation")}</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="douNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("douNumber")}</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="douSection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("douSection")}</FormLabel>
                      <FormControl>
                        <Input placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="douPage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("douPage")}</FormLabel>
                      <FormControl>
                        <Input placeholder="45" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="douDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("douDate")}</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            )}

            {/* RNM Information Section */}
            {false && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">{t("rnmInformation")}</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rnmNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("rnmNumber")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("rnmNumberPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rnmDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("rnmDeadline")}</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            )}

            {/* Process Status */}
            <FormField
              control={form.control}
              name="processStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("processStatus")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectProcessStatus")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Atual">{t("processStatusCurrent")}</SelectItem>
                      <SelectItem value="Anterior">{t("processStatusPrevious")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? tCommon("loading") : tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Unsaved Changes Confirmation Dialog */}
    <UnsavedChangesDialog
      open={showUnsavedDialog}
      onOpenChange={setShowUnsavedDialog}
      onConfirm={handleConfirmClose}
      onCancel={handleCancelClose}
    />
    </>
  )
}
