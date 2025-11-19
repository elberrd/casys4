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
import { CPFInput } from "@/components/ui/cpf-input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { ComboboxWithCreate } from "@/components/ui/combobox-with-create"
import { DatePicker } from "@/components/ui/date-picker"
import { CompanyQuickCreateDialog } from "@/components/companies/company-quick-create-dialog"
import { QuickCityFormDialog } from "@/components/cities/quick-city-form-dialog"
import { Separator } from "@/components/ui/separator"
import { PassportsSubtable } from "@/components/people/passports-subtable"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { personSchema, PersonFormData, maritalStatusOptions } from "@/lib/validations/people"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useCpfValidation } from "@/hooks/use-cpf-validation"
import { CpfValidationFeedback } from "@/components/ui/cpf-validation-feedback"
import { useCountryTranslation } from "@/lib/i18n/countries"

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
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [quickCityDialogOpen, setQuickCityDialogOpen] = useState(false)
  const getCountryName = useCountryTranslation()

  const person = useQuery(
    api.people.get,
    personId ? { id: personId } : "skip"
  )

  const currentCompany = useQuery(
    api.peopleCompanies.getCurrentByPerson,
    personId ? { personId } : "skip"
  )

  const cities = useQuery(api.cities.listWithRelations, {}) ?? []
  const countries = useQuery(api.countries.list, {}) ?? []
  const companies = useQuery(api.companies.listActive, {}) ?? []
  const createPerson = useMutation(api.people.create)
  const updatePerson = useMutation(api.people.update)
  const upsertCompanyRelationship = useMutation(api.peopleCompanies.upsertCurrent)

  const form = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      fullName: "",
      email: "",
      cpf: "",
      birthDate: "",
      birthCityId: "" as Id<"cities">,
      nationalityId: "" as Id<"countries">,
      maritalStatus: "",
      profession: "",
      motherName: "",
      fatherName: "",
      phoneNumber: "",
      address: "",
      currentCityId: "" as Id<"cities">,
      photoUrl: "",
      notes: "",
      companyId: "" as Id<"companies">,
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
        fullName: person.fullName,
        email: person.email,
        cpf: person.cpf ?? "",
        birthDate: person.birthDate,
        birthCityId: person.birthCityId,
        nationalityId: person.nationalityId,
        maritalStatus: person.maritalStatus as "Single" | "Married" | "Divorced" | "Widowed",
        profession: person.profession,
        motherName: person.motherName,
        fatherName: person.fatherName,
        phoneNumber: person.phoneNumber,
        address: person.address,
        currentCityId: person.currentCityId,
        photoUrl: person.photoUrl ?? "",
        notes: person.notes ?? "",
        companyId: currentCompany?.companyId ?? ("" as Id<"companies">),
      })
    }
  }, [person, currentCompany, form])

  const onSubmit = async (data: PersonFormData) => {
    try {
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

      // Separate company fields from person data first
      const companyId = data.companyId === "" ? undefined : data.companyId

      // Clean optional fields - convert empty strings to undefined
      // Exclude companyId from submitData as it's handled separately
      const { companyId: _, ...dataWithoutCompany } = data
      const submitData = {
        ...dataWithoutCompany,
        email: data.email || undefined,
        cpf: data.cpf || undefined,
        birthDate: data.birthDate || undefined,
        birthCityId: data.birthCityId || undefined,
        nationalityId: data.nationalityId || undefined,
        maritalStatus: data.maritalStatus || undefined,
        profession: data.profession || undefined,
        motherName: data.motherName || undefined,
        fatherName: data.fatherName || undefined,
        phoneNumber: data.phoneNumber || undefined,
        address: data.address || undefined,
        currentCityId: data.currentCityId || undefined,
        photoUrl: data.photoUrl || undefined,
        notes: data.notes || undefined,
      }

      let savedPersonId: Id<"people">

      if (personId) {
        await updatePerson({ id: personId, ...submitData })
        savedPersonId = personId
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        savedPersonId = await createPerson(submitData)
        toast({
          title: t('createdSuccess'),
        })
      }

      // Update company relationship if provided
      await upsertCompanyRelationship({
        personId: savedPersonId,
        companyId,
        role: undefined,
      })

      // Call onSuccess callback if provided, otherwise navigate to list
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/people')
      }
    } catch (error) {
      toast({
        title: personId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    router.push('/people')
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

  const companyOptions = companies.map((company) => ({
    value: company._id,
    label: company.name,
  }))

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          {personId ? t('editTitle') : t('newPerson')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {personId
            ? "Edit the person information below"
            : t('createDescription')
          }
        </p>
      </div>
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('personalInfo')}</h3>

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fullName')}</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                          <Plus className="h-4 w-4 mr-1" />
                          {t('quickAddCity')}
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
                          label: t(`maritalStatus${option.value}` as any),
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
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('company')}</FormLabel>
                    <FormControl>
                      <ComboboxWithCreate
                        options={companyOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t('selectCompany')}
                        canCreate={true}
                        createButtonLabel={t('createNewCompany')}
                        onCreateClick={() => setCompanyDialogOpen(true)}
                      />
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
                onClick={handleCancel}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
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
      </div>

      {/* Company Quick Create Dialog */}
      <CompanyQuickCreateDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        onSuccess={(companyId) => {
          form.setValue('companyId', companyId)
          setCompanyDialogOpen(false)
        }}
      />

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
