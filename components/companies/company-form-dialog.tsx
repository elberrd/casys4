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
import { EconomicActivityQuickCreateDialog } from "@/components/economic-activities"

interface CompanyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId?: Id<"companies">
  onSuccess?: () => void
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: CompanyFormDialogProps) {
  const t = useTranslations('Companies')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()
  const [showEconomicActivityDialog, setShowEconomicActivityDialog] = useState(false)

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
    } else if (!companyId) {
      form.reset({
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
        contactPersonId: "",
        economicActivityIds: [],
        isActive: true,
        notes: "",
      })
    }
  }, [company, companyId, companyEconomicActivities, form])

  const onSubmit = async (data: CompanyFormData) => {
    try {
      // Clean optional fields and convert empty strings to undefined
      const submitData = {
        ...data,
        openingDate: data.openingDate || undefined,
        website: data.website || undefined,
        address: data.address || undefined,
        addressStreet: data.addressStreet || undefined,
        addressNumber: data.addressNumber || undefined,
        addressComplement: data.addressComplement || undefined,
        addressNeighborhood: data.addressNeighborhood || undefined,
        addressPostalCode: data.addressPostalCode || undefined,
        cityId: data.cityId === "" ? undefined : data.cityId,
        contactPersonId: data.contactPersonId === "" ? undefined : data.contactPersonId,
        notes: data.notes || undefined,
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
      if (data.economicActivityIds && data.economicActivityIds.length > 0) {
        await setEconomicActivities({
          companyId: savedCompanyId,
          economicActivityIds: data.economicActivityIds,
        })
      }

      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: companyId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
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
      setShowEconomicActivityDialog(true)
      const handleSuccess = (newActivityId: Id<"economicActivities">) => {
        const currentActivities = form.getValues("economicActivityIds") || []
        form.setValue("economicActivityIds", [...currentActivities, newActivityId])
        resolve(newActivityId)
      }
      // Store the callback temporarily
      ;(window as any).__economicActivityCallback = handleSuccess
    })
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {companyId ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {companyId
              ? "Edit the company information below"
              : "Fill in the information to create a new company"
            }
          </DialogDescription>
        </DialogHeader>

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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? tCommon('loading') : tCommon('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <EconomicActivityQuickCreateDialog
        open={showEconomicActivityDialog}
        onOpenChange={setShowEconomicActivityDialog}
        onSuccess={(newActivityId) => {
          const callback = (window as any).__economicActivityCallback
          if (callback) {
            callback(newActivityId)
            delete (window as any).__economicActivityCallback
          }
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
