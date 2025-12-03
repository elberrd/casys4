"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
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
import { CNPJInput } from "@/components/ui/cnpj-input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Combobox } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { companyQuickCreateSchema, CompanyQuickCreateFormData } from "@/lib/validations/companies"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

interface QuickCompanyApplicantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (companyId: Id<"companies">) => void
}

export function QuickCompanyApplicantFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickCompanyApplicantFormDialogProps) {
  const t = useTranslations("Companies")
  const tCommon = useTranslations("Common")
  const tIndividual = useTranslations("IndividualProcesses")

  const cities = useQuery(api.cities.listWithRelations, {}) ?? []
  const createCompany = useMutation(api.companies.create)

  const form = useForm<CompanyQuickCreateFormData>({
    resolver: zodResolver(companyQuickCreateSchema),
    defaultValues: {
      name: "",
      taxId: "",
      openingDate: "",
      email: "",
      phoneNumber: "",
      cityId: "" as Id<"cities">,
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

  const onSubmit = async (data: CompanyQuickCreateFormData) => {
    try {
      // Clean optional fields and convert empty strings to undefined
      const submitData = {
        name: data.name,
        taxId: data.taxId || undefined,
        openingDate: data.openingDate || undefined,
        email: data.email || undefined,
        phoneNumber: data.phoneNumber || undefined,
        cityId: data.cityId === "" ? undefined : data.cityId,
      }

      const companyId = await createCompany(submitData)

      toast.success(t("companyCreated"))
      form.reset()
      onSuccess(companyId)
      onOpenChange(false)
    } catch (error) {
      toast.error(t("errorCreate"))
    }
  }

  const cityOptions = cities.map((city) => ({
    value: city._id,
    label: `${city.name}${city.state ? ` - ${city.state.code}` : ""}`,
  }))

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tIndividual("quickAddCompanyApplicant")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
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
                  <FormLabel>{t("taxId")}</FormLabel>
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
                  <FormLabel>{t("openingDate")}</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("selectOpeningDate")}
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
                  <FormLabel>{t("email")}</FormLabel>
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
                  <FormLabel>{t("phoneNumber")}</FormLabel>
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
                  <FormLabel>{t("city")}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={cityOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t("selectCity")}
                      searchPlaceholder={tCommon("search")}
                      emptyText={tCommon("noResults")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? tCommon("loading") : tCommon("save")}
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
