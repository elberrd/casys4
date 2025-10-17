"use client"

import { useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"
import {
  individualProcessSchema,
  IndividualProcessFormData,
} from "@/lib/validations/individualProcesses"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

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
  const { toast } = useToast()
  const router = useRouter()

  const individualProcess = useQuery(
    api.individualProcesses.get,
    individualProcessId ? { id: individualProcessId } : "skip"
  )

  const mainProcesses = useQuery(api.mainProcesses.list) ?? []
  const people = useQuery(api.people.search, { query: "" }) ?? []
  const legalFrameworks = useQuery(api.legalFrameworks.list) ?? []
  const cboCodes = useQuery(api.cboCodes.list) ?? []

  const createIndividualProcess = useMutation(api.individualProcesses.create)
  const updateIndividualProcess = useMutation(api.individualProcesses.update)

  const form = useForm<IndividualProcessFormData>({
    resolver: zodResolver(individualProcessSchema),
    defaultValues: {
      mainProcessId: "" as Id<"mainProcesses">,
      personId: "" as Id<"people">,
      status: "",
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

  // Reset form when individual process data loads
  useEffect(() => {
    if (individualProcess) {
      form.reset({
        mainProcessId: individualProcess.mainProcessId,
        personId: individualProcess.personId,
        status: individualProcess.status,
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
        status: "",
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

  const onSubmit = async (data: IndividualProcessFormData) => {
    try {
      // Clean optional fields
      const submitData = {
        ...data,
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
        await updateIndividualProcess({ id: individualProcessId, ...submitData })
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

  const mainProcessOptions = mainProcesses.map((process) => ({
    value: process._id,
    label: process.referenceNumber,
  }))

  const peopleOptions = people.map((person) => ({
    value: person._id,
    label: person.fullName,
  }))

  const legalFrameworkOptions = legalFrameworks.map((framework) => ({
    value: framework._id,
    label: framework.name,
  }))

  const cboOptions = cboCodes.map((cbo) => ({
    value: cbo._id,
    label: `${cbo.code} - ${cbo.title}`,
  }))

  const statusOptions = [
    { value: "pending_documents", label: t("statusPendingDocuments") },
    { value: "documents_submitted", label: t("statusDocumentsSubmitted") },
    { value: "documents_approved", label: t("statusDocumentsApproved") },
    { value: "preparing_submission", label: t("statusPreparingSubmission") },
    { value: "submitted_to_government", label: t("statusSubmittedToGovernment") },
    { value: "under_government_review", label: t("statusUnderGovernmentReview") },
    { value: "government_approved", label: t("statusGovernmentApproved") },
    { value: "government_rejected", label: t("statusGovernmentRejected") },
    { value: "completed", label: t("statusCompleted") },
    { value: "cancelled", label: t("statusCancelled") },
  ]

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("status")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectStatus")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            </div>

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
      </div>
    </div>
  )
}
