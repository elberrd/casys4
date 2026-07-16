"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { useCountryTranslation } from "@/lib/i18n/countries"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { passportSchema, type PassportFormData } from "@/lib/validations/passports"
import { toast } from "sonner"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { usePassportNumberValidation } from "@/hooks/use-passport-number-validation"
import { PassportNumberValidationFeedback } from "@/components/ui/passport-number-validation-feedback"
import { passportUploadResponseSchema } from "@/lib/validations/passport-ocr"
import {
  PassportAiUploadField,
  type ExtractedAdminPassportFields,
} from "@/components/passports/passport-ai-upload-field"

interface PassportFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  passportId?: Id<"passports">
  personId?: Id<"people">
  onSuccess?: (passportId?: Id<"passports">) => void
}

function calculateStatus(expiryDate: string): "Valid" | "Expiring Soon" | "Expired" {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

  if (expiry < today) {
    return "Expired"
  } else if (expiry < sixMonthsFromNow) {
    return "Expiring Soon"
  } else {
    return "Valid"
  }
}

function getStatusVariant(status: "Valid" | "Expiring Soon" | "Expired") {
  switch (status) {
    case "Valid":
      return "success"
    case "Expiring Soon":
      return "warning"
    case "Expired":
      return "destructive"
  }
}

export function PassportFormDialog({
  open,
  onOpenChange,
  passportId,
  personId,
  onSuccess,
}: PassportFormDialogProps) {
  const t = useTranslations("Passports")
  const tCommon = useTranslations("Common")
  const getCountryName = useCountryTranslation()

  const passport = useQuery(
    api.passports.get,
    passportId ? { id: passportId } : "skip"
  )
  const people = useQuery(api.people.list, {}) ?? []
  const countries = useQuery(api.countries.list, {}) ?? []

  const createPassport = useMutation(api.passports.create)
  const updatePassport = useMutation(api.passports.update)
  const generateUploadUrl = useMutation(api.passportUpload.generateUploadUrl)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preparedStorageId, setPreparedStorageId] = useState<
    Id<"_storage"> | undefined
  >()
  const [isUploading, setIsUploading] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  const form = useForm<PassportFormData>({
    resolver: zodResolver(passportSchema),
    defaultValues: {
      personId: personId ?? "",
      passportNumber: "",
      issuingCountryId: "",
      issueDate: "",
      expiryDate: "",
      fileUrl: "",
      isActive: true,
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

  const watchedPassportNumber = form.watch("passportNumber")
  const watchedIssuingCountryId = form.watch("issuingCountryId")
  const watchedIssueDate = form.watch("issueDate")
  const watchedPersonId = form.watch("personId")
  const { isChecking: isPassportChecking, isAvailable: isPassportAvailable, existingPassport } = usePassportNumberValidation({
    passportNumber: watchedPassportNumber,
    passportId: passportId,
    enabled: open,
  })

  const expiryDate = form.watch("expiryDate")
  const status = expiryDate ? calculateStatus(expiryDate) : null

  useEffect(() => {
    if (passport) {
      form.reset({
        personId: passport.personId,
        passportNumber: passport.passportNumber,
        issuingCountryId: passport.issuingCountryId,
        issueDate: passport.issueDate,
        expiryDate: passport.expiryDate,
        fileUrl: passport.fileUrl ?? "",
        isActive: passport.isActive,
      })
    } else if (personId) {
      form.setValue("personId", personId)
    }
  }, [passport, personId, form])

  // Clear the picked file whenever the dialog closes so it doesn't linger.
  useEffect(() => {
    if (!open) {
      setSelectedFile(null)
      setPreparedStorageId(undefined)
      setIsUploading(false)
      setIsAiProcessing(false)
    }
  }, [open])

  const currentFileUrl = form.watch("fileUrl")

  const handleRemoveCurrentFile = () => {
    form.setValue("fileUrl", "", { shouldDirty: true })
  }

  const handleApplyExtractedFields = (
    fields: ExtractedAdminPassportFields
  ) => {
    form.setValue("passportNumber", fields.passportNumber, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    form.setValue("issuingCountryId", fields.issuingCountryId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    form.setValue("issueDate", fields.issueDate, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    form.setValue("expiryDate", fields.expiryDate, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isAiProcessing) return
    handleOpenChange(nextOpen)
  }

  const onSubmit = async (data: PassportFormData) => {
    if (isPassportChecking) {
      toast.error(t("passportNumberValidationInProgress"))
      return
    }
    if (isPassportAvailable === false) {
      toast.error(t("passportNumberDuplicateError"))
      return
    }

    try {
      // Upload the picked document to Convex storage first (if any).
      let storageId = preparedStorageId
      if (selectedFile && !storageId) {
        setIsUploading(true)
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        })
        if (!result.ok) throw new Error("Failed to upload file")
        const uploadResult = passportUploadResponseSchema.parse(
          await result.json()
        )
        storageId = uploadResult.storageId
        setIsUploading(false)
      }

      if (passportId) {
        await updatePassport({
          id: passportId,
          personId: data.personId as Id<"people">,
          passportNumber: data.passportNumber,
          issuingCountryId: data.issuingCountryId as Id<"countries">,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          // New upload wins; otherwise pass the current value so an
          // unchanged file is preserved and a removed one ("") is cleared.
          ...(storageId ? { storageId } : { fileUrl: data.fileUrl ?? "" }),
          isActive: data.isActive,
        })
        toast.success(t("updatedSuccess"))
        onSuccess?.(passportId)
      } else {
        const newPassportId = await createPassport({
          personId: data.personId as Id<"people">,
          passportNumber: data.passportNumber,
          issuingCountryId: data.issuingCountryId as Id<"countries">,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          ...(storageId ? { storageId } : {}),
          isActive: data.isActive,
        })
        toast.success(t("createdSuccess"))
        onSuccess?.(newPassportId)
      }
    } catch {
      setIsUploading(false)
      toast.error(passportId ? t("errorUpdate") : t("errorCreate"))
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={!isAiProcessing}
      >
        <DialogHeader>
          <DialogTitle>
            {passportId ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <PassportAiUploadField
                selectedFile={selectedFile}
                currentFileUrl={currentFileUrl}
                currentFields={{
                  passportNumber: watchedPassportNumber,
                  issuingCountryId: watchedIssuingCountryId,
                  issueDate: watchedIssueDate,
                  expiryDate,
                }}
                disabled={
                  !watchedPersonId ||
                  isUploading ||
                  form.formState.isSubmitting
                }
                onSelectedFileChange={setSelectedFile}
                onCurrentFileRemove={handleRemoveCurrentFile}
                onStorageIdChange={setPreparedStorageId}
                onApplyExtractedFields={handleApplyExtractedFields}
                onProcessingChange={setIsAiProcessing}
              />

              {!watchedPersonId && (
                <p className="text-sm text-amber-700 dark:text-amber-300" role="status">
                  {t("selectPersonBeforePassport")}
                </p>
              )}

              <FormField
                control={form.control}
                name="personId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("person")}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={(value) => field.onChange(value || "")}
                        disabled={
                          Boolean(personId) ||
                          isAiProcessing ||
                          Boolean(selectedFile) ||
                          Boolean(preparedStorageId)
                        }
                        options={people.map((person) => ({
                          value: person._id,
                          label: person.fullName,
                        }))}
                        placeholder={t("selectPerson")}
                        searchPlaceholder={tCommon("search")}
                        emptyText={tCommon("noResults")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passportNumber"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>{t("passportNumber")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                    <PassportNumberValidationFeedback
                      isChecking={isPassportChecking}
                      isAvailable={isPassportAvailable}
                      existingPassport={existingPassport}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issuingCountryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("issuingCountry")}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={(value) => field.onChange(value || "")}
                        options={countries.map((country) => {
                          const translatedName = getCountryName(country.code) || country.name
                          return {
                            value: country._id,
                            label: translatedName,
                          }
                        })}
                        placeholder={t("selectCountry")}
                        searchPlaceholder={tCommon("search")}
                        emptyText={tCommon("noResults")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("issueDate")}</FormLabel>
                      <FormControl>
                        <DatePicker
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
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("expiryDate")}</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("status")}:</span>
                  <Badge variant={getStatusVariant(status)}>
                    {t(`status${status.replace(" ", "")}`)}
                  </Badge>
                </div>
              )}

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("isActive")}</FormLabel>
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
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isAiProcessing}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={!watchedPersonId || form.formState.isSubmitting || isUploading || isAiProcessing || isPassportChecking || isPassportAvailable === false}>
                {form.formState.isSubmitting || isUploading || isAiProcessing ? tCommon("loading") : tCommon("save")}
              </Button>
            </div>
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
