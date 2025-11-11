"use client"

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
import { Combobox } from "@/components/ui/combobox"
import { useTranslations } from "next-intl"
import { companyQuickCreateSchema, CompanyQuickCreateFormData } from "@/lib/validations/companies"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

interface CompanyQuickCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (companyId: Id<"companies">) => void
}

/**
 * Simplified company creation dialog for inline use in other forms.
 * Contains only essential fields: name, taxId, email, phoneNumber, and cityId.
 */
export function CompanyQuickCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: CompanyQuickCreateDialogProps) {
  const t = useTranslations('Companies')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const cities = useQuery(api.cities.listWithRelations, {}) ?? []
  const createCompany = useMutation(api.companies.create)

  const form = useForm<CompanyQuickCreateFormData>({
    resolver: zodResolver(companyQuickCreateSchema),
    defaultValues: {
      name: "",
      taxId: "",
      email: "",
      phoneNumber: "",
      cityId: "" as Id<"cities">,
    },
  })

  const onSubmit = async (data: CompanyQuickCreateFormData) => {
    try {
      // Clean optional fields and convert empty strings to undefined
      const submitData = {
        name: data.name,
        taxId: data.taxId || undefined,
        email: data.email || undefined,
        phoneNumber: data.phoneNumber || undefined,
        cityId: data.cityId === "" ? undefined : data.cityId,
      }

      const companyId = await createCompany(submitData)

      toast({
        title: t('companyCreated'),
      })

      form.reset()
      onOpenChange(false)
      onSuccess?.(companyId)
    } catch (error) {
      toast({
        title: t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const cityOptions = cities.map((city) => ({
    value: city._id,
    label: `${city.name}${city.state ? ` - ${city.state.code}` : ''}`,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('quickCreateTitle')}</DialogTitle>
          <DialogDescription>
            {t('quickCreateDescription')}
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
