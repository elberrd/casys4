"use client"

import { useEffect } from "react"
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
import { PhoneInput } from "@/components/ui/phone-input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Combobox } from "@/components/ui/combobox"
import { useTranslations } from "next-intl"
import { companySchema, CompanyFormData } from "@/lib/validations/companies"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

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

  const company = useQuery(
    api.companies.get,
    companyId ? { id: companyId } : "skip"
  )

  const cities = useQuery(api.cities.listWithRelations, {}) ?? []
  const people = useQuery(api.people.search, { query: "" }) ?? []
  const createCompany = useMutation(api.companies.create)
  const updateCompany = useMutation(api.companies.update)

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      taxId: "",
      website: "",
      address: "",
      cityId: "" as Id<"cities">,
      phoneNumber: "",
      email: "",
      contactPersonId: "" as Id<"people"> | "",
      isActive: true,
      notes: "",
    },
  })

  // Reset form when company data loads
  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        taxId: company.taxId,
        website: company.website ?? "",
        address: company.address,
        cityId: company.cityId,
        phoneNumber: company.phoneNumber,
        email: company.email,
        contactPersonId: company.contactPersonId ?? "",
        isActive: company.isActive,
        notes: company.notes ?? "",
      })
    } else if (!companyId) {
      form.reset({
        name: "",
        taxId: "",
        website: "",
        address: "",
        cityId: "" as Id<"cities">,
        phoneNumber: "",
        email: "",
        contactPersonId: "",
        isActive: true,
        notes: "",
      })
    }
  }, [company, companyId, form])

  const onSubmit = async (data: CompanyFormData) => {
    try {
      // Clean optional fields and convert empty strings to undefined
      const submitData = {
        ...data,
        cityId: data.cityId === "" ? undefined : data.cityId,
        website: data.website || undefined,
        contactPersonId: data.contactPersonId === "" ? undefined : data.contactPersonId,
        notes: data.notes || undefined,
      }

      if (companyId) {
        await updateCompany({ id: companyId, ...submitData })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createCompany(submitData)
        toast({
          title: t('createdSuccess'),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
    </Dialog>
  )
}
