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
import { CPFInput } from "@/components/ui/cpf-input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { Combobox } from "@/components/ui/combobox"
import { QuickCityFormDialog } from "@/components/cities/quick-city-form-dialog"
import { Separator } from "@/components/ui/separator"
import { CompaniesSubtable } from "@/components/people/companies-subtable"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  personSchema,
  type PersonFormData,
  maritalStatusOptions,
  maritalStatusTranslationKeys,
  sexOptions,
  sexTranslationKeys,
} from "@/lib/validations/people"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { useCpfValidation } from "@/hooks/use-cpf-validation"
import { CpfValidationFeedback } from "@/components/ui/cpf-validation-feedback"
import { useCountryTranslation } from "@/lib/i18n/countries"
import { LinkedDocIndicator } from "@/components/ui/linked-doc-indicator"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  PersonPassportAiAttachmentField,
  type PersonPassportAttachmentValue,
  type PersonPassportDuplicateWarning,
} from "@/components/people/person-passport-ai-attachment-field"
import type { PersonPassportOcrFields } from "@/lib/validations/passport-ocr"


interface PersonFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  personId?: Id<"people">
  individualProcessId?: Id<"individualProcesses">
  onSuccess?: () => void
}

export function PersonFormDialog({
  open,
  onOpenChange,
  personId,
  individualProcessId,
  onSuccess,
}: PersonFormDialogProps) {
  const t = useTranslations('People')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()
  const [quickCityDialogOpen, setQuickCityDialogOpen] = useState(false)
  const [passportAttachment, setPassportAttachment] =
    useState<PersonPassportAttachmentValue | null>(null)
  const [passportDuplicateWarning, setPassportDuplicateWarning] =
    useState<PersonPassportDuplicateWarning | null>(null)
  const [isPassportBusy, setIsPassportBusy] = useState(false)
  const getCountryName = useCountryTranslation()

  const person = useQuery(
    api.people.get,
    personId ? { id: personId } : "skip"
  )
  const savedPassportAttachment = useQuery(
    api.personPassportAttachments.getByPerson,
    open && personId ? { personId } : "skip"
  )

  const cities = useQuery(api.cities.listWithRelations, {}) ?? []
  const countries = useQuery(api.countries.list, {}) ?? []
  const createPerson = useMutation(api.people.create)
  const updatePerson = useMutation(api.people.update)
  const replacePassportAttachment = useMutation(
    api.personPassportAttachments.replace
  )
  const removePassportAttachment = useMutation(
    api.personPassportAttachments.remove
  )

  const form = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      givenNames: "",
      middleName: "",
      surname: "",
      email: "",
      cpf: "",
      birthDate: "",
      birthCityId: "" as Id<"cities">,
      nationalityId: "" as Id<"countries">,
      maritalStatus: "",
      profession: "",
      cargo: "",
      motherName: "",
      fatherName: "",
      phoneNumber: "",
      address: "",
      currentCityId: "" as Id<"cities">,
      photoUrl: "",
      notes: "",
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
      setPassportDuplicateWarning(null)
      onOpenChange(false)
    },
    isSubmitting: form.formState.isSubmitting,
  })

  // Watch CPF field for real-time validation
  const cpfValue = form.watch('cpf')

  // CPF duplicate validation
  const { isChecking, isAvailable, existingPerson } = useCpfValidation({
    cpf: cpfValue,
    personId: personId,
    enabled: true,
  })

  // Reset form when person data loads
  useEffect(() => {
    if (person) {
      form.reset({
        givenNames: person.givenNames,
        middleName: person.middleName ?? "",
        surname: person.surname ?? "",
        email: person.email,
        cpf: person.cpf ?? "",
        birthDate: person.birthDate,
        birthCityId: person.birthCityId,
        nationalityId: person.nationalityId,
        sex: person.sex as "Male" | "Female" | undefined,
        maritalStatus: person.maritalStatus as "Single" | "Married" | "Divorced" | "Widowed",
        profession: person.profession,
        cargo: person.cargo,
        motherName: person.motherName,
        fatherName: person.fatherName,
        phoneNumber: person.phoneNumber,
        address: person.address,
        currentCityId: person.currentCityId,
        photoUrl: person.photoUrl ?? "",
        notes: person.notes ?? "",
      })
    } else if (!personId) {
      form.reset({
        givenNames: "",
        middleName: "",
        surname: "",
        email: "",
        cpf: "",
        birthDate: "",
        birthCityId: "" as Id<"cities">,
        nationalityId: "" as Id<"countries">,
        sex: "",
        maritalStatus: "",
        profession: "",
        cargo: "",
        motherName: "",
        fatherName: "",
        phoneNumber: "",
        address: "",
        currentCityId: "" as Id<"cities">,
        photoUrl: "",
        notes: "",
      })
    }
  }, [person, personId, form])

  useEffect(() => {
    if (!open || !personId || savedPassportAttachment === undefined) return
    setPassportAttachment(
      savedPassportAttachment
        ? {
            storageId: savedPassportAttachment.storageId,
            fileName: savedPassportAttachment.fileName,
            mimeType: savedPassportAttachment.mimeType,
            fileSize: savedPassportAttachment.fileSize,
            url: savedPassportAttachment.url,
            persisted: true,
          }
        : null
    )
  }, [open, personId, savedPassportAttachment])

  const handleApplyPassportFields = (fields: PersonPassportOcrFields) => {
    if (fields.givenNames) {
      form.setValue("givenNames", fields.givenNames, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
    if (fields.middleName) {
      form.setValue("middleName", fields.middleName, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
    if (fields.surname) {
      form.setValue("surname", fields.surname, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
    if (fields.birthDate) {
      form.setValue("birthDate", fields.birthDate, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
    if (fields.sex) {
      form.setValue("sex", fields.sex, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
    if (fields.nationalityId) {
      form.setValue("nationalityId", fields.nationalityId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
    if (fields.motherName) {
      form.setValue("motherName", fields.motherName, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
    if (fields.fatherName) {
      form.setValue("fatherName", fields.fatherName, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
  }

  const handlePassportAttachmentChange = async (
    nextAttachment: PersonPassportAttachmentValue
  ) => {
    if (!personId) return
    await replacePassportAttachment({
      personId,
      storageId: nextAttachment.storageId,
      fileName: nextAttachment.fileName,
    })
    setPassportAttachment({ ...nextAttachment, persisted: true })
  }

  const handlePassportAttachmentRemove = async () => {
    if (!personId) return
    await removePassportAttachment({ personId })
    setPassportAttachment(null)
    setPassportDuplicateWarning(null)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPassportBusy) {
      toast({ title: t("passportOperationCloseBlocked") })
      return
    }
    handleOpenChange(nextOpen)
  }

  const onSubmit = async (data: PersonFormData) => {
    try {
      if (
        passportDuplicateWarning?.passportOwner?.personId &&
        passportDuplicateWarning.passportOwner.personId !== personId
      ) {
        toast({
          title: t("passportDuplicateTitle"),
          description: t("passportDuplicateDescription", {
            passportNumber:
              passportDuplicateWarning.passportOwner.passportNumber,
            personName: passportDuplicateWarning.passportOwner.personName,
          }),
          variant: "destructive",
        })
        return
      }

      // Check if CPF validation is in progress
      if (isChecking) {
        toast({
          title: t('cpfValidationInProgress'),
          variant: "destructive",
        })
        return
      }

      // Check if CPF is already in use
      if (isAvailable === false) {
        toast({
          title: t('cpfDuplicateError'),
          description: existingPerson ? t('cpfInUseBy', { name: existingPerson.fullName }) : undefined,
          variant: "destructive",
        })
        return
      }

      // Clean optional fields - convert empty strings to undefined
      const submitData = {
        ...data,
        email: data.email || undefined,
        cpf: data.cpf === "" ? "" : data.cpf, // Send empty string instead of undefined
        birthDate: data.birthDate || undefined,
        birthCityId: data.birthCityId === "" ? undefined : data.birthCityId,
        nationalityId: data.nationalityId === "" ? undefined : data.nationalityId,
        sex: data.sex || undefined,
        maritalStatus: data.maritalStatus || undefined,
        profession: data.profession || undefined,
        cargo: data.cargo || undefined,
        motherName: data.motherName || undefined,
        fatherName: data.fatherName || undefined,
        phoneNumber: data.phoneNumber || undefined,
        address: data.address || undefined,
        currentCityId: data.currentCityId === "" ? undefined : data.currentCityId,
        photoUrl: data.photoUrl || undefined,
        notes: data.notes || undefined,
      }

      if (personId) {
        await updatePerson({ id: personId, ...submitData })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createPerson(submitData)
        toast({
          title: t('createdSuccess'),
        })
      }

      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: personId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const cityOptions = cities.map((city) => ({
    value: city._id,
    label: `${city.name}${city.state ? ` - ${city.state.code}` : ''}`,
  }))

  const countryOptions = countries.map((country) => {
    const translatedName = getCountryName(country.code) || country.name
    return {
      value: country._id,
      label: country.flag ? `${country.flag} ${translatedName}` : translatedName,
    }
  })

  const DocIcon = ({ fieldPath }: { fieldPath: string }) => (
    <LinkedDocIndicator
      individualProcessId={individualProcessId}
      entityType="person"
      fieldPath={fieldPath}
    />
  )

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <TooltipProvider>
        <DialogHeader>
          <DialogTitle>
            {personId ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {personId
              ? t("editDescription")
              : t("createDescription")
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {personId && (
              <>
                <PersonPassportAiAttachmentField
                  attachment={passportAttachment}
                  duplicateWarning={passportDuplicateWarning}
                  currentFields={{
                    givenNames: form.watch("givenNames"),
                    middleName: form.watch("middleName") ?? "",
                    surname: form.watch("surname") ?? "",
                    birthDate: form.watch("birthDate") ?? "",
                    sex: form.watch("sex") ?? "",
                    nationalityId: form.watch("nationalityId") ?? "",
                    motherName: form.watch("motherName") ?? "",
                    fatherName: form.watch("fatherName") ?? "",
                  }}
                  disabled={form.formState.isSubmitting || isChecking}
                  onAttachmentChange={handlePassportAttachmentChange}
                  onAttachmentRemove={handlePassportAttachmentRemove}
                  onApplyExtractedPersonFields={handleApplyPassportFields}
                  onDuplicateWarningChange={setPassportDuplicateWarning}
                  onProcessingChange={setIsPassportBusy}
                />
                <Separator />
              </>
            )}

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('personalInfo')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="givenNames"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('givenNames')}</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('middleName')}</FormLabel>
                      <FormControl>
                        <Input placeholder="" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="surname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('surname')}</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">{t('cpf')}<DocIcon fieldPath="cpf" /></FormLabel>
                      <div className="relative">
                        <FormControl>
                          <CPFInput {...field} />
                        </FormControl>
                        <CpfValidationFeedback
                          isChecking={isChecking}
                          isAvailable={isAvailable}
                          existingPerson={existingPerson}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">{t('birthDate')}<DocIcon fieldPath="birthDate" /></FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          showYearMonthDropdowns
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthCityId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-start justify-between">
                        <FormLabel>{t('birthCity')}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setQuickCityDialogOpen(true)}
                          className="h-7"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormControl>
                        <Combobox
                          options={cityOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder={t('selectBirthCity')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="nationalityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">{t('nationality')}<DocIcon fieldPath="nationalityId" /></FormLabel>
                    <FormControl>
                      <Combobox
                        options={countryOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t('selectNationality')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Family Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('familyInfo')}</h3>

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">{t('sex')}<DocIcon fieldPath="sex" /></FormLabel>
                    <FormControl>
                      <Combobox
                        options={sexOptions.map((option) => ({
                          value: option.value,
                          label: t(sexTranslationKeys[option.value]),
                        }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t('selectSex')}
                        showClearButton={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">{t('maritalStatus')}<DocIcon fieldPath="maritalStatus" /></FormLabel>
                    <FormControl>
                      <Combobox
                        options={maritalStatusOptions.map((option) => ({
                          value: option.value,
                          label: t(maritalStatusTranslationKeys[option.value]),
                        }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t('selectMaritalStatus')}
                        showClearButton={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">{t('motherName')}<DocIcon fieldPath="motherName" /></FormLabel>
                    <FormControl>
                      <Input placeholder="Mother's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fatherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">{t('fatherName')}<DocIcon fieldPath="fatherName" /></FormLabel>
                    <FormControl>
                      <Input placeholder="Father's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('professionalInfo')}</h3>

              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">{t('profession')}<DocIcon fieldPath="profession" /></FormLabel>
                    <FormControl>
                      <Input placeholder="Software Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('cargo')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('cargoPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('contactInfo')}</h3>

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phoneNumber')}</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} defaultCountry="BR" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('address')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentCityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('currentCity')}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={cityOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t('selectCurrentCity')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('additionalInfo')}</h3>

              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('photoUrl')}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/photo.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('notes')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Companies Section - Only show when editing existing person */}
            {personId && (
              <>
                <Separator />
                <CompaniesSubtable personId={personId} />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={isPassportBusy || form.formState.isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  form.formState.isSubmitting ||
                  isPassportBusy ||
                  isChecking ||
                  isAvailable === false
                }
              >
                {form.formState.isSubmitting ? tCommon('loading') : tCommon('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </TooltipProvider>
      </DialogContent>

      {/* Quick City Form Dialog */}
      <QuickCityFormDialog
        open={quickCityDialogOpen}
        onOpenChange={setQuickCityDialogOpen}
        onSuccess={(cityId) => {
          form.setValue('birthCityId', cityId)
          setQuickCityDialogOpen(false)
        }}
      />
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
