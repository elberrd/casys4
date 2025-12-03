"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
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
import { PhoneInput } from "@/components/ui/phone-input"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { consulateSchema, ConsulateFormData } from "@/lib/validations/consulates"
import { QuickCityFormDialog } from "@/components/cities/quick-city-form-dialog"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

interface QuickConsulateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (consulateId: Id<"consulates">) => void
}

export function QuickConsulateFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickConsulateFormDialogProps) {
  const t = useTranslations("Consulates")
  const tCommon = useTranslations("Common")
  const tIndividual = useTranslations("IndividualProcesses")

  const [quickCityDialogOpen, setQuickCityDialogOpen] = useState(false)

  const cities = useQuery(api.cities.listWithRelations, {}) ?? []
  const createConsulate = useMutation(api.consulates.create)

  const form = useForm<ConsulateFormData>({
    resolver: zodResolver(consulateSchema),
    defaultValues: {
      cityId: "",
      address: "",
      phoneNumber: "",
      email: "",
      website: "",
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

  const onSubmit = async (data: ConsulateFormData) => {
    try {
      // Clean optional fields and convert empty strings to undefined
      const submitData = {
        cityId: data.cityId === "" ? undefined : data.cityId as Id<"cities">,
        address: data.address || undefined,
        phoneNumber: data.phoneNumber || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
      }

      const consulateId = await createConsulate(submitData)

      toast.success(t("createdSuccess"))
      form.reset()
      onSuccess(consulateId)
      onOpenChange(false)
    } catch (error) {
      toast.error(t("errorCreate"))
    }
  }

  const cityOptions = cities.map((city) => ({
    value: city._id,
    label: `${city.name}${city.state ? ` - ${city.state.code}` : ""}${city.country ? `, ${city.country.name}` : ""}`,
  }))

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tIndividual("quickAddConsulate")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start justify-between">
                    <FormLabel>{t("city")}</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuickCityDialogOpen(true)}
                      className="h-7"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("quickAddCity")}
                    </Button>
                  </div>
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

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("address")}</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Embassy Street" {...field} />
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@consulate.gov" {...field} />
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
                  <FormLabel>{t("website")}</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://consulate.gov" {...field} />
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

      <QuickCityFormDialog
        open={quickCityDialogOpen}
        onOpenChange={setQuickCityDialogOpen}
        onSuccess={(cityId) => {
          form.setValue("cityId", cityId)
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
