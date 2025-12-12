"use client"

import { useEffect, useState, useRef } from "react"
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
import { CNPJInput } from "@/components/ui/cnpj-input"
import { CEPInput } from "@/components/ui/cep-input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Combobox } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"
import { companySchema, CompanyFormData } from "@/lib/validations/companies"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { EconomicActivityQuickCreateDialog } from "@/components/economic-activities"

interface CompanyFormPageProps {
  companyId?: Id<"companies">
  onSuccess?: () => void
}

export function CompanyFormPage({
  companyId,
  onSuccess,
}: CompanyFormPageProps) {
  const t = useTranslations('Companies')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()
  const router = useRouter()
  const [showEconomicActivityDialog, setShowEconomicActivityDialog] = useState(false)
  const economicActivityResolveRef = useRef<((id: Id<"economicActivities">) => void) | null>(null)

  const company = useQuery(
    api.companies.get,
    companyId ? { id: companyId } : "skip"
  )

  const cities = useQuery(api.cities.listWithRelations, {}) ?? []
  const people = useQuery(api.people.search, { query: "" }) ?? []
  const economicActivities = useQuery(api.economicActivities.listActive, {}) ?? []
  const companyEconomicActivities = useQuery(
    api.companies.getEconomicActivities,
    companyId ? { companyId } : "skip"
  )
  const createCompany = useMutation(api.companies.create)
  const updateCompany = useMutation(api.companies.update)
  const setEconomicActivities = useMutation(api.companies.setEconomicActivities)
  const createCity = useMutation(api.cities.create)

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      taxId: "",
      openingDate: "",
      website: "",
      address: "",
      addressStreet: "",
      addressNumber: "",
      addressComplement: "",
      addressNeighborhood: "",
      addressPostalCode: "",
      cityId: "" as Id<"cities">,
      phoneNumber: "",
      email: "",
      contactPersonId: "" as Id<"people"> | "",
      economicActivityIds: [],
      isActive: true,
      notes: "",
    },
  })

  // Reset form when company data loads
  useEffect(() => {
    if (company) {
      const activityIds = companyEconomicActivities?.map((a) => a._id) ?? []
      form.reset({
        name: company.name,
        taxId: company.taxId,
        openingDate: company.openingDate ?? "",
        website: company.website ?? "",
        address: company.address ?? "",
        addressStreet: company.addressStreet ?? "",
        addressNumber: company.addressNumber ?? "",
        addressComplement: company.addressComplement ?? "",
        addressNeighborhood: company.addressNeighborhood ?? "",
        addressPostalCode: company.addressPostalCode ?? "",
        cityId: company.cityId,
        phoneNumber: company.phoneNumber,
        email: company.email,
        contactPersonId: company.contactPersonId ?? "",
        economicActivityIds: activityIds,
        isActive: company.isActive,
        notes: company.notes ?? "",
      })
    }
  }, [company, companyEconomicActivities, form])

  const onSubmit = async (data: CompanyFormData) => {
    try {
      // Separate economicActivityIds from company data
      const { economicActivityIds, ...companyData } = data;

      // Clean optional fields and convert empty strings to undefined
      const submitData = {
        ...companyData,
        openingDate: companyData.openingDate || undefined,
        website: companyData.website || undefined,
        address: companyData.address || undefined,
        addressStreet: companyData.addressStreet || undefined,
        addressNumber: companyData.addressNumber || undefined,
        addressComplement: companyData.addressComplement || undefined,
        addressNeighborhood: companyData.addressNeighborhood || undefined,
        addressPostalCode: companyData.addressPostalCode || undefined,
        cityId: companyData.cityId === "" ? undefined : companyData.cityId,
        contactPersonId: companyData.contactPersonId === "" ? undefined : companyData.contactPersonId,
        notes: companyData.notes || undefined,
      }

      let savedCompanyId: Id<"companies">

      if (companyId) {
        await updateCompany({ id: companyId, ...submitData })
        savedCompanyId = companyId
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        savedCompanyId = await createCompany(submitData)
        toast({
          title: t('createdSuccess'),
        })
      }

      // Save economic activities
      if (economicActivityIds && economicActivityIds.length > 0) {
        await setEconomicActivities({
          companyId: savedCompanyId,
          economicActivityIds: economicActivityIds,
        })
      }

      // Call onSuccess callback if provided, otherwise navigate to list
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/companies')
      }
    } catch (error) {
      toast({
        title: companyId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    router.push('/companies')
  }

  const handleCreateCity = async (cityName: string): Promise<Id<"cities">> => {
    try {
      const cityId = await createCity({ name: cityName })
      toast({
        title: t('cityCreatedSuccess'),
      })
      return cityId
    } catch (error) {
      toast({
        title: t('errorCreateCity'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
      throw error
    }
  }

  const cityOptions = cities.map((city) => ({
    value: city._id,
    label: `${city.name}${city.state ? ` - ${city.state.code}` : ''}`,
  }))

  const peopleOptions = people.map((person) => ({
    value: person._id,
    label: person.fullName,
  }))

  const economicActivityOptions = economicActivities.map((activity) => ({
    value: activity._id,
    label: activity.name,
  }))

  const handleCreateEconomicActivity = async (activityName: string): Promise<Id<"economicActivities">> => {
    return new Promise((resolve) => {
      economicActivityResolveRef.current = resolve
      setShowEconomicActivityDialog(true)
    })
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          {companyId ? t('editTitle') : t('newCompany')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {companyId
            ? "Edit the company information below"
            : t('createDescription')
          }
        </p>
      </div>
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('taxId')}</FormLabel>
                  <FormControl>
                    <CNPJInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="openingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('openingDate')}</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('selectOpeningDate')}
                      showYearMonthDropdowns={true}
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('email')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('website')}</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Section */}
            <div className="space-y-4 pt-4">
              <div>
                <h3 className="text-sm font-medium">{t('addressSection')}</h3>
                <Separator className="mt-2" />
              </div>

              <FormField
                control={form.control}
                name="addressPostalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('postalCode')}</FormLabel>
                    <FormControl>
                      <CEPInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
                <FormField
                  control={form.control}
                  name="addressStreet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('street')}</FormLabel>
                      <FormControl>
                        <Input placeholder="Avenida Paulista" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('number')}</FormLabel>
                      <FormControl>
                        <Input placeholder="1000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="addressNeighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('neighborhood')}</FormLabel>
                      <FormControl>
                        <Input placeholder="Bela Vista" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressComplement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('complement')}</FormLabel>
                      <FormControl>
                        <Input placeholder="Sala 101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('city')}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={cityOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('selectCity')}
                      emptyText={t('noCityFound')}
                      onCreateNew={handleCreateCity}
                      createNewText={t('createNewCity')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="economicActivityIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('economicActivities')}</FormLabel>
                  <FormControl>
                    <Combobox
                      multiple={true}
                      options={economicActivityOptions}
                      value={field.value || []}
                      onValueChange={field.onChange}
                      placeholder={t('selectEconomicActivities')}
                      onCreateNew={handleCreateEconomicActivity}
                      createNewText={t('createNewEconomicActivity')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPersonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contactPerson')}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={peopleOptions}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder={t('selectContactPerson')}
                    />
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

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t('isActive')}</FormLabel>
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
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? tCommon('loading') : tCommon('save')}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <EconomicActivityQuickCreateDialog
        open={showEconomicActivityDialog}
        onOpenChange={setShowEconomicActivityDialog}
        onSuccess={(newActivityId) => {
          // Add the new activity to the current selection
          const currentActivities = form.getValues("economicActivityIds") || []
          form.setValue("economicActivityIds", [...currentActivities, newActivityId])

          // Resolve the promise if there's a resolver
          if (economicActivityResolveRef.current) {
            economicActivityResolveRef.current(newActivityId)
            economicActivityResolveRef.current = null
          }
        }}
      />
    </div>
  )
}
