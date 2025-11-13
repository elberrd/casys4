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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Combobox } from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { PersonSelectorWithDetail } from "@/components/individual-processes/person-selector-with-detail"
import { PassportSelector } from "@/components/individual-processes/passport-selector"
import { ApplicantSelector } from "@/components/individual-processes/applicant-selector"
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
    resolver: zodResolver(individualProcessSchema),
    defaultValues: {
      mainProcessId: "" as Id<"mainProcesses">,
      personId: "" as Id<"people">,
      passportId: "",
      applicantId: "",
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
      isActive: true,
    },
  })

  // Get passports for the selected person
  const selectedPersonId = form.watch("personId")
  const personPassports = useQuery(
    api.passports.listByPerson,
    selectedPersonId ? { personId: selectedPersonId as Id<"people"> } : "skip"
  ) ?? []

  // Watch process type for cascading legal framework filtering
  const selectedProcessTypeId = form.watch("processTypeId")

  // Get filtered legal frameworks based on selected process type
  const filteredLegalFrameworks = useQuery(
    api.processTypes.getLegalFrameworks,
    selectedProcessTypeId && selectedProcessTypeId !== ""
      ? { processTypeId: selectedProcessTypeId as Id<"processTypes"> }
      : "skip"
  )

  // Fallback to all legal frameworks if no process type selected
  const allLegalFrameworks = useQuery(api.legalFrameworks.listActive, {})

  // Use filtered or all legal frameworks
  const legalFrameworks = selectedProcessTypeId && selectedProcessTypeId !== ""
    ? (filteredLegalFrameworks ?? [])
    : (allLegalFrameworks ?? [])

  // Reset form when individual process data loads
  useEffect(() => {
    if (individualProcess) {
      form.reset({
        mainProcessId: individualProcess.mainProcessId,
        personId: individualProcess.personId,
        passportId: individualProcess.passportId ?? "",
        applicantId: individualProcess.applicantId ?? "",
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
        isActive: individualProcess.isActive,
      })
    } else if (!individualProcessId) {
      form.reset({
        mainProcessId: "" as Id<"mainProcesses">,
        personId: "" as Id<"people">,
        passportId: "",
        applicantId: "",
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
        isActive: true,
      })
    }
  }, [individualProcess, individualProcessId, form])

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

  // Clear legal framework when process type changes
  useEffect(() => {
    // Clear legal framework when process type changes or is cleared
    const currentLegalFrameworkId = form.getValues("legalFrameworkId")
    if (currentLegalFrameworkId) {
      // Reset legal framework when process type changes
      form.setValue("legalFrameworkId", "" as Id<"legalFrameworks">)
    }
  }, [selectedProcessTypeId])

  const onSubmit = async (data: IndividualProcessFormData) => {
    try {
      // Clean optional fields - convert empty strings to undefined
      const submitData = {
        ...data,
        mainProcessId: data.mainProcessId || undefined,
        passportId: data.passportId || undefined,
        applicantId: data.applicantId || undefined,
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

      // Call onSuccess callback if provided, otherwise navigate to list
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/individual-processes')
      }

      form.reset()
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

  const legalFrameworkOptions = legalFrameworks.map((framework) => ({
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
                name="applicantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("applicant")}</FormLabel>
                    <FormControl>
                      <ApplicantSelector
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
                      <Input type="date" {...field} />
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
                        <Input type="date" {...field} />
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
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
