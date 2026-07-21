"use client"

import { useEffect, useRef, useState } from "react"
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
import { CPFInput } from "@/components/ui/cpf-input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { QuickCityFormDialog } from "@/components/cities/quick-city-form-dialog"
import { Separator } from "@/components/ui/separator"
import { PassportsSubtable } from "@/components/people/passports-subtable"
import { CompaniesSubtable } from "@/components/people/companies-subtable"
import { Plus } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
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
import { useRouter } from "next/navigation"
import { useCpfValidation } from "@/hooks/use-cpf-validation"
import { CpfValidationFeedback } from "@/components/ui/cpf-validation-feedback"
import { useCountryTranslation } from "@/lib/i18n/countries"
import {
  PersonPassportAiAttachmentField,
  type PersonPassportAttachmentValue,
  type PersonPassportDuplicateWarning,
  type PersonPassportVerification,
} from "@/components/people/person-passport-ai-attachment-field"
import type { PersonPassportOcrFields } from "@/lib/validations/passport-ocr"

type PassportCreationError =
  | { code: "PASSPORT_VERIFICATION_REQUIRED" }
  | {
      code: "PASSPORT_ALREADY_LINKED"
      passportNumber: string
      personId: Id<"people">
      personName: string
    }

function parsePassportCreationError(error: unknown): PassportCreationError | null {
  if (!error || typeof error !== "object" || !("data" in error)) return null
  const data = (error as { data?: unknown }).data
  if (!data || typeof data !== "object" || !("code" in data)) return null

  const code = (data as { code?: unknown }).code
  if (code === "PASSPORT_VERIFICATION_REQUIRED") return { code }
  if (code !== "PASSPORT_ALREADY_LINKED") return null

  const conflict = data as Record<string, unknown>
  if (
    typeof conflict.passportNumber !== "string" ||
    typeof conflict.personId !== "string" ||
    typeof conflict.personName !== "string"
  ) {
    return null
  }

  return {
    code,
    passportNumber: conflict.passportNumber,
    personId: conflict.personId as Id<"people">,
    personName: conflict.personName,
  }
}

interface PersonFormPageProps {
  personId?: Id<"people">
  onSuccess?: () => void
}

export function PersonFormPage({
  personId,
  onSuccess,
}: PersonFormPageProps) {
  const t = useTranslations('People')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()
  const router = useRouter()
  const locale = useLocale()
  const [quickCityDialogOpen, setQuickCityDialogOpen] = useState(false)
  const [passportAttachment, setPassportAttachment] =
    useState<PersonPassportAttachmentValue | null>(null)
  const [passportDuplicateWarning, setPassportDuplicateWarning] =
    useState<PersonPassportDuplicateWarning | null>(null)
  const [passportVerification, setPassportVerification] =
    useState<PersonPassportVerification | null>(null)
  const [isPassportBusy, setIsPassportBusy] = useState(false)
  const passportAttachmentRef =
    useRef<PersonPassportAttachmentValue | null>(null)
  const getCountryName = useCountryTranslation()

  const person = useQuery(
    api.people.get,
    personId ? { id: personId } : "skip"
  )
  const savedPassportAttachment = useQuery(
    api.personPassportAttachments.getByPerson,
    personId ? { personId } : "skip"
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
  const discardUnlinkedPassportUpload = useMutation(
    api.personPassportAttachments.discardUnlinkedUpload
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
      sex: "",
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
        maritalStatus: person.maritalStatus as "Single" | "Married" | "Divorced" | "Widowed",
        sex: person.sex as "Male" | "Female" | undefined,
        profession: person.profession,
        cargo: person.cargo ?? "",
        motherName: person.motherName,
        fatherName: person.fatherName,
        phoneNumber: person.phoneNumber,
        address: person.address,
        currentCityId: person.currentCityId,
        photoUrl: person.photoUrl ?? "",
        notes: person.notes ?? "",
      })
    }
  }, [person, form])

  useEffect(() => {
    if (!personId || savedPassportAttachment === undefined) return
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
  }, [personId, savedPassportAttachment])

  useEffect(() => {
    passportAttachmentRef.current = passportAttachment
  }, [passportAttachment])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        form.formState.isDirty ||
        (passportAttachment && !passportAttachment.persisted) ||
        isPassportBusy
      ) {
        event.preventDefault()
      }
    }
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [form.formState.isDirty, isPassportBusy, passportAttachment])

  useEffect(() => {
    return () => {
      const pendingAttachment = passportAttachmentRef.current
      if (pendingAttachment && !pendingAttachment.persisted) {
        void discardUnlinkedPassportUpload({
          storageId: pendingAttachment.storageId,
        })
      }
    }
  }, [discardUnlinkedPassportUpload])

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
    const previousAttachment = passportAttachment

    if (personId) {
      await replacePassportAttachment({
        personId,
        storageId: nextAttachment.storageId,
        fileName: nextAttachment.fileName,
      })
      const persistedAttachment = { ...nextAttachment, persisted: true }
      passportAttachmentRef.current = persistedAttachment
      setPassportAttachment(persistedAttachment)
    } else {
      passportAttachmentRef.current = nextAttachment
      setPassportAttachment(nextAttachment)
      if (
        previousAttachment &&
        !previousAttachment.persisted &&
        previousAttachment.storageId !== nextAttachment.storageId
      ) {
        try {
          await discardUnlinkedPassportUpload({
            storageId: previousAttachment.storageId,
          })
        } catch {
          // The new attachment is already selected; cleanup can be retried by
          // the idempotent backend mutation without reverting the form state.
        }
      }
    }
  }

  const handlePassportAttachmentRemove = async (
    attachment: PersonPassportAttachmentValue
  ) => {
    if (personId && attachment.persisted) {
      await removePassportAttachment({ personId })
    } else if (!attachment.persisted) {
      await discardUnlinkedPassportUpload({ storageId: attachment.storageId })
    }
    passportAttachmentRef.current = null
    setPassportAttachment(null)
    setPassportDuplicateWarning(null)
    setPassportVerification(null)
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
      if (passportDuplicateWarning?.matches.length) {
        toast({
          title: t("personNameMatchTitle"),
          description: t("personNameMatchReview"),
          variant: "destructive",
        })
        return
      }
      if (
        !personId &&
        passportAttachment &&
        passportVerification?.storageId !== passportAttachment.storageId
      ) {
        toast({
          title: t("passportVerificationTitle"),
          description: t("passportVerificationRequired"),
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
        cpf: data.cpf || undefined,
        birthDate: data.birthDate || undefined,
        birthCityId: data.birthCityId || undefined,
        nationalityId: data.nationalityId || undefined,
        maritalStatus: data.maritalStatus || undefined,
        sex: data.sex || undefined,
        profession: data.profession || undefined,
        cargo: data.cargo || undefined,
        motherName: data.motherName || undefined,
        fatherName: data.fatherName || undefined,
        phoneNumber: data.phoneNumber || undefined,
        address: data.address || undefined,
        currentCityId: data.currentCityId || undefined,
        photoUrl: data.photoUrl || undefined,
        notes: data.notes || undefined,
      }

      if (personId) {
        await updatePerson({ id: personId, ...submitData })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createPerson({
          ...submitData,
          ...(passportAttachment
            ? {
                passportAttachment: {
                  storageId: passportAttachment.storageId,
                  fileName: passportAttachment.fileName,
                },
              }
            : {}),
        })
        if (passportAttachment) {
          const persistedAttachment = {
            ...passportAttachment,
            persisted: true,
          }
          passportAttachmentRef.current = persistedAttachment
          setPassportAttachment(persistedAttachment)
        }
        toast({
          title: t('createdSuccess'),
        })
      }

      // Call onSuccess callback if provided, otherwise navigate to list
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/${locale}/people`)
      }
    } catch (error) {
      const passportError = parsePassportCreationError(error)
      if (passportError?.code === "PASSPORT_ALREADY_LINKED") {
        setPassportDuplicateWarning({
          passportOwner: {
            personId: passportError.personId,
            personName: passportError.personName,
            passportNumber: passportError.passportNumber,
          },
          matches: [],
        })
        toast({
          title: t("passportDuplicateTitle"),
          description: t("passportDuplicateDescription", {
            passportNumber: passportError.passportNumber,
            personName: passportError.personName,
          }),
          variant: "destructive",
        })
        return
      }
      if (passportError?.code === "PASSPORT_VERIFICATION_REQUIRED") {
        setPassportVerification(null)
        toast({
          title: t("passportVerificationTitle"),
          description: t("passportVerificationRequired"),
          variant: "destructive",
        })
        return
      }
      toast({
        title: personId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const handleCancel = async () => {
    if (isPassportBusy) return
    try {
      if (passportAttachment && !passportAttachment.persisted) {
        await discardUnlinkedPassportUpload({
          storageId: passportAttachment.storageId,
        })
      }
      passportAttachmentRef.current = null
      router.push(`/${locale}/people`)
    } catch {
      toast({
        title: t("passportAttachmentRemoveError"),
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

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          {personId ? t('editTitle') : t('newPerson')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {personId
            ? t("editDescription")
            : t('createDescription')
          }
        </p>
      </div>
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <PersonPassportAiAttachmentField
              attachment={passportAttachment}
              duplicateWarning={passportDuplicateWarning}
              requiresCreationVerification={!personId}
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
              onVerificationChange={setPassportVerification}
              onProcessingChange={setIsPassportBusy}
            />

            <Separator />

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
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('birthDate')}</FormLabel>
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
                    <FormLabel>{t('nationality')}</FormLabel>
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
                      <FormLabel>{t('cpf')}</FormLabel>
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
            </div>

            <Separator />

            {/* Family Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('familyInfo')}</h3>

              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maritalStatus')}</FormLabel>
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
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sex')}</FormLabel>
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
                name="motherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('motherName')}</FormLabel>
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
                    <FormLabel>{t('fatherName')}</FormLabel>
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
                    <FormLabel>{t('profession')}</FormLabel>
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

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCancel()}
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
                  isAvailable === false ||
                  Boolean(
                    passportDuplicateWarning?.passportOwner?.personId,
                  ) ||
                  Boolean(passportDuplicateWarning?.matches.length) ||
                  (!personId &&
                    passportAttachment !== null &&
                    passportVerification?.storageId !==
                      passportAttachment.storageId)
                }
              >
                {form.formState.isSubmitting ? tCommon('loading') : tCommon('save')}
              </Button>
            </div>
          </form>
        </Form>

        {/* Passports Section - Only show when editing existing person */}
        {personId && (
          <div className="mt-8">
            <Separator className="mb-6" />
            <PassportsSubtable personId={personId} />
          </div>
        )}

        {/* Companies Section - Only show when editing existing person */}
        {personId && (
          <div className="mt-8">
            <Separator className="mb-6" />
            <CompaniesSubtable personId={personId} />
          </div>
        )}
      </div>

      {/* Quick City Form Dialog */}
      <QuickCityFormDialog
        open={quickCityDialogOpen}
        onOpenChange={setQuickCityDialogOpen}
        onSuccess={(cityId) => {
          form.setValue('birthCityId', cityId)
          setQuickCityDialogOpen(false)
        }}
      />
    </div>
  )
}
