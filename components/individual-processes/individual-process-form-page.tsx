"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Separator } from "@/components/ui/separator"
import { PersonSelectorWithDetail } from "@/components/individual-processes/person-selector-with-detail"
import { PassportSelector } from "@/components/individual-processes/passport-selector"
import { ApplicantSelector } from "@/components/individual-processes/applicant-selector"
import { CompanyApplicantSelector } from "@/components/individual-processes/company-applicant-selector"
import { UserApplicantSelector } from "@/components/individual-processes/user-applicant-selector"
import { QuickPersonFormDialog } from "@/components/individual-processes/quick-person-form-dialog"
import { InitialStatusForm } from "@/components/individual-processes/initial-status-form"
import { IndividualProcessStatusesSubtable } from "@/components/individual-processes/individual-process-statuses-subtable"
import { useTranslations, useLocale } from "next-intl"
import {
  individualProcessSchema,
  IndividualProcessFormData,
} from "@/lib/validations/individualProcesses"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

interface IndividualProcessFormPageProps {
  individualProcessId?: Id<"individualProcesses">
  onSuccess?: () => void
}

export function IndividualProcessFormPage({
  individualProcessId,
  onSuccess,
}: IndividualProcessFormPageProps) {
  const t = useTranslations("IndividualProcesses")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const { toast } = useToast()
  const router = useRouter()

  const [quickPersonDialogOpen, setQuickPersonDialogOpen] = useState(false)
  const [hasInitializedForm, setHasInitializedForm] = useState(false)
  const [previousProcessTypeId, setPreviousProcessTypeId] = useState<string>("")

  // State for initial status when creating new process
  const [initialStatus, setInitialStatus] = useState<{
    caseStatusId: Id<"caseStatuses">;
    date: string;
  } | null>(null)

  const individualProcess = useQuery(
    api.individualProcesses.get,
    individualProcessId ? { id: individualProcessId } : "skip"
  )

  const mainProcesses = useQuery(api.mainProcesses.list, {}) ?? []
  const processTypes = useQuery(api.processTypes.listActive, {}) ?? []
  const cboCodes = useQuery(api.cboCodes.list, {}) ?? []
  const caseStatuses = useQuery(api.caseStatuses.listActive, {}) ?? []

  const createIndividualProcess = useMutation(api.individualProcesses.create)
  const updateIndividualProcess = useMutation(api.individualProcesses.update)

  const form = useForm<IndividualProcessFormData>({
    resolver: zodResolver(individualProcessSchema) as any,
    defaultValues: {
      mainProcessId: "" as Id<"mainProcesses">,
      dateProcess: new Date().toISOString().split('T')[0], // Pre-fill with today's date
      personId: "" as Id<"people">,
      passportId: "",
      applicantId: "", // DEPRECATED
      companyApplicantId: "",
      userApplicantId: "",
      caseStatusId: "" as Id<"caseStatuses">,
      status: "", // DEPRECATED: Kept for backward compatibility
      processTypeId: "",
      legalFrameworkId: "" as Id<"legalFrameworks">,
      cboId: "",
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
      isActive: true,
    },
  })

  // Get passports for the selected person
  const selectedPersonId = form.watch("personId")
  const personPassports = useQuery(
    api.passports.listByPerson,
    selectedPersonId ? { personId: selectedPersonId as Id<"people"> } : "skip"
  ) ?? []

  // Watch authorization type for cascading legal framework filtering
  const selectedProcessTypeId = form.watch("processTypeId")

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

  // Reset form when individual process data loads (only once)
  useEffect(() => {
    // Reset the initialization flag when the individualProcessId changes
    setHasInitializedForm(false)
  }, [individualProcessId])

  useEffect(() => {
    // Only initialize the form once when data first loads
    if (individualProcess && !hasInitializedForm) {
      form.reset({
        mainProcessId: individualProcess.mainProcessId,
        dateProcess: individualProcess.dateProcess ?? "",
        personId: individualProcess.personId,
        passportId: individualProcess.passportId ?? "",
        applicantId: individualProcess.applicantId ?? "", // DEPRECATED
        companyApplicantId: individualProcess.companyApplicantId ?? "",
        userApplicantId: individualProcess.userApplicantId ?? "",
        caseStatusId: individualProcess.caseStatusId ?? ("" as Id<"caseStatuses">),
        status: individualProcess.status ?? "", // DEPRECATED: Kept for backward compatibility
        processTypeId: individualProcess.processTypeId ?? "",
        legalFrameworkId: individualProcess.legalFrameworkId,
        cboId: individualProcess.cboId ?? "",
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
        isActive: individualProcess.isActive,
      })
      setHasInitializedForm(true)
    } else if (individualProcess && hasInitializedForm) {
      // Update form fields that might have been changed by filled fields modal
      // Only update if the values actually changed to avoid overwriting user input
      const currentValues = form.getValues()
      const updates: Partial<IndividualProcessFormData> = {}

      // Reference fields
      if (currentValues.dateProcess !== (individualProcess.dateProcess ?? "")) {
        updates.dateProcess = individualProcess.dateProcess ?? ""
      }
      if (currentValues.passportId !== (individualProcess.passportId ?? "")) {
        updates.passportId = individualProcess.passportId ?? ""
      }
      if (currentValues.applicantId !== (individualProcess.applicantId ?? "")) {
        updates.applicantId = individualProcess.applicantId ?? ""
      }
      if (currentValues.companyApplicantId !== (individualProcess.companyApplicantId ?? "")) {
        updates.companyApplicantId = individualProcess.companyApplicantId ?? ""
      }
      if (currentValues.userApplicantId !== (individualProcess.userApplicantId ?? "")) {
        updates.userApplicantId = individualProcess.userApplicantId ?? ""
      }
      if (currentValues.processTypeId !== (individualProcess.processTypeId ?? "")) {
        updates.processTypeId = individualProcess.processTypeId ?? ""
      }
      if (currentValues.legalFrameworkId !== (individualProcess.legalFrameworkId ?? ("" as Id<"legalFrameworks">))) {
        updates.legalFrameworkId = individualProcess.legalFrameworkId ?? ("" as Id<"legalFrameworks">)
      }
      if (currentValues.cboId !== (individualProcess.cboId ?? "")) {
        updates.cboId = individualProcess.cboId ?? ""
      }

      // String fields
      if (currentValues.douNumber !== (individualProcess.douNumber ?? "")) {
        updates.douNumber = individualProcess.douNumber ?? ""
      }
      if (currentValues.douSection !== (individualProcess.douSection ?? "")) {
        updates.douSection = individualProcess.douSection ?? ""
      }
      if (currentValues.douPage !== (individualProcess.douPage ?? "")) {
        updates.douPage = individualProcess.douPage ?? ""
      }
      if (currentValues.douDate !== (individualProcess.douDate ?? "")) {
        updates.douDate = individualProcess.douDate ?? ""
      }
      if (currentValues.protocolNumber !== (individualProcess.protocolNumber ?? "")) {
        updates.protocolNumber = individualProcess.protocolNumber ?? ""
      }
      if (currentValues.rnmNumber !== (individualProcess.rnmNumber ?? "")) {
        updates.rnmNumber = individualProcess.rnmNumber ?? ""
      }
      if (currentValues.rnmDeadline !== (individualProcess.rnmDeadline ?? "")) {
        updates.rnmDeadline = individualProcess.rnmDeadline ?? ""
      }
      if (currentValues.mreOfficeNumber !== (individualProcess.mreOfficeNumber ?? "")) {
        updates.mreOfficeNumber = individualProcess.mreOfficeNumber ?? ""
      }
      if (currentValues.appointmentDateTime !== (individualProcess.appointmentDateTime ?? "")) {
        updates.appointmentDateTime = individualProcess.appointmentDateTime ?? ""
      }
      if (currentValues.deadlineDate !== (individualProcess.deadlineDate ?? "")) {
        updates.deadlineDate = individualProcess.deadlineDate ?? ""
      }
      if (currentValues.deadlineUnit !== (individualProcess.deadlineUnit ?? "")) {
        updates.deadlineUnit = individualProcess.deadlineUnit ?? ""
      }
      if (currentValues.deadlineQuantity !== individualProcess.deadlineQuantity) {
        updates.deadlineQuantity = individualProcess.deadlineQuantity
      }
      if (currentValues.deadlineSpecificDate !== (individualProcess.deadlineSpecificDate ?? "")) {
        updates.deadlineSpecificDate = individualProcess.deadlineSpecificDate ?? ""
      }

      // Apply updates if there are any
      if (Object.keys(updates).length > 0) {
        Object.entries(updates).forEach(([key, value]) => {
          form.setValue(key as any, value, { shouldValidate: false, shouldDirty: false })
        })
      }
    } else if (!individualProcessId && !hasInitializedForm) {
      form.reset({
        mainProcessId: "" as Id<"mainProcesses">,
        dateProcess: new Date().toISOString().split('T')[0], // Pre-fill with today's date
        personId: "" as Id<"people">,
        passportId: "",
        applicantId: "", // DEPRECATED
        companyApplicantId: "",
        userApplicantId: "",
        caseStatusId: "" as Id<"caseStatuses">,
        status: "", // DEPRECATED: Kept for backward compatibility
        processTypeId: "",
        legalFrameworkId: "" as Id<"legalFrameworks">,
        cboId: "",
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
        isActive: true,
      })
      setHasInitializedForm(true)
    }
  }, [individualProcess, individualProcessId, form, hasInitializedForm])

  // Automatically select valid and active passport when person changes
  useEffect(() => {
    // Skip if we're editing an existing process (don't override existing passport selection)
    if (individualProcessId && individualProcess) {
      return
    }

    // If person changed, clear the passport field first
    if (selectedPersonId) {
      const currentPassportId = form.getValues("passportId")
      if (currentPassportId) {
        form.setValue("passportId", "")
      }
    }

    // Only proceed if we have a person selected and passports loaded
    if (!selectedPersonId || personPassports.length === 0) {
      return
    }

    // Find a valid and active passport
    const validActivePassport = personPassports.find(
      (passport) => passport.isActive && passport.status === "Valid"
    )

    // If found, automatically select it
    if (validActivePassport) {
      form.setValue("passportId", validActivePassport._id)
    }
  }, [selectedPersonId, personPassports, individualProcessId, individualProcess, form])

  // Clear legal framework when authorization type changes (but not on initial load)
  useEffect(() => {
    // Only clear if authorization type actually changed (not on initial load)
    if (previousProcessTypeId && previousProcessTypeId !== selectedProcessTypeId) {
      const currentLegalFrameworkId = form.getValues("legalFrameworkId")
      if (currentLegalFrameworkId) {
        // Reset legal framework when authorization type changes
        form.setValue("legalFrameworkId", "" as Id<"legalFrameworks">)
      }
    }
    // Update the previous authorization type
    setPreviousProcessTypeId(selectedProcessTypeId || "")
  }, [selectedProcessTypeId, previousProcessTypeId, form])

  const onSubmit = async (data: IndividualProcessFormData) => {
    try {
      // Clean optional fields - convert empty strings to undefined
      const submitData = {
        ...data,
        mainProcessId: data.mainProcessId || undefined,
        dateProcess: data.dateProcess || undefined,
        passportId: data.passportId || undefined,
        applicantId: data.applicantId || undefined, // DEPRECATED
        companyApplicantId: data.companyApplicantId || undefined,
        userApplicantId: data.userApplicantId || undefined,
        caseStatusId: data.caseStatusId,
        status: data.status || undefined, // DEPRECATED: Kept for backward compatibility
        processTypeId: data.processTypeId || undefined,
        legalFrameworkId: data.legalFrameworkId || undefined,
        cboId: data.cboId || undefined,
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
        deadlineUnit: data.deadlineUnit || undefined,
        deadlineQuantity: data.deadlineQuantity,
        deadlineSpecificDate: data.deadlineSpecificDate || undefined,
      }

      if (individualProcessId) {
        // Remove personId and mainProcessId from submit data when updating (can't change these on existing process)
        const { personId, mainProcessId, ...updateData } = submitData
        await updateIndividualProcess({ id: individualProcessId, ...updateData })
        toast({
          title: t("updatedSuccess"),
        })
        // Reset the initialization flag so the form can be re-initialized with updated data
        setHasInitializedForm(false)
      } else {
        await createIndividualProcess(submitData)
        toast({
          title: t("createdSuccess"),
        })
      }

      // Call onSuccess callback if provided, otherwise navigate to list
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/individual-processes')
      }

      if (!individualProcessId) {
        form.reset()
      }
    } catch (error) {
      toast({
        title: individualProcessId ? t("errorUpdate") : t("errorCreate"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    router.push('/individual-processes')
  }

  const handleQuickPersonSuccess = (personId: Id<"people">) => {
    form.setValue("personId", personId)
    setQuickPersonDialogOpen(false)
  }

  const mainProcessOptions = mainProcesses.map((process) => ({
    value: process._id,
    label: process.referenceNumber,
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

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          {individualProcessId ? t("editTitle") : t("newProcess")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {individualProcessId
            ? "Edit the individual process information below"
            : t("createDescription")}
        </p>
      </div>
      <div>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              // Only allow submission if triggered by the submit button
              const submitter = (e.nativeEvent as SubmitEvent).submitter;
              if (!submitter || submitter.getAttribute('type') !== 'submit') {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-6"
          >
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
                    <FormDescription>
                      {t("dateProcessSyncDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mainProcessId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("mainProcess")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={mainProcessOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t("selectMainProcess")}
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
                name="personId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start justify-between">
                      <FormLabel>{t("person")}</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuickPersonDialogOpen(true)}
                        className="h-7"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t("quickAddPerson")}
                      </Button>
                    </div>
                    <FormControl>
                      <PersonSelectorWithDetail
                        value={field.value}
                        onChange={field.onChange}
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
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>
            </div>

            {/* Status Section - Show Initial Status Form when creating */}
            {!individualProcessId && (
              <InitialStatusForm
                onStatusChange={(caseStatusId, date) => {
                  setInitialStatus({ caseStatusId, date })
                  // Also update the form's caseStatusId for backend compatibility
                  form.setValue("caseStatusId", caseStatusId)
                }}
                defaultDate={new Date().toISOString().split('T')[0]}
              />
            )}

            {/* Status History Subtable - Show when editing, right after required fields */}
            {individualProcessId && (
              <>
                <Separator className="my-6" />
                <IndividualProcessStatusesSubtable
                  individualProcessId={individualProcessId}
                  userRole="admin"
                />
              </>
            )}

            <Separator />

            {/* Optional Fields Section */}
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
                name="protocolNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("protocolNumber")}</FormLabel>
                    <FormControl>
                      <Input placeholder="PROT-123456" {...field} />
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

            </div>

            <Separator />

            {/* DOU Information Section */}
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

            <Separator />

            {/* RNM Information Section */}
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
                        <Input placeholder="RNM-123456" {...field} />
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

            <Separator />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t("isActive")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? tCommon("loading") : tCommon("save")}
              </Button>
            </div>
          </form>
        </Form>

        <QuickPersonFormDialog
          open={quickPersonDialogOpen}
          onOpenChange={setQuickPersonDialogOpen}
          onSuccess={handleQuickPersonSuccess}
        />
      </div>
    </div>
  )
}
