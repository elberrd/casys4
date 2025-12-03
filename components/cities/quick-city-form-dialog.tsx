"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { z } from "zod"
import { useCountryTranslation } from "@/lib/i18n/countries"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

// Simplified city schema for quick add - only essential fields
const quickCitySchema = z.object({
  name: z.string().min(1, "City name is required"),
  stateId: z
    .custom<Id<"states">>((val) => typeof val === "string", {
      message: "State ID must be valid",
    })
    .optional()
    .or(z.literal("")),
  countryId: z
    .custom<Id<"countries">>((val) => typeof val === "string", {
      message: "Country ID must be valid",
    })
    .optional()
    .or(z.literal("")),
})

type QuickCityFormData = z.infer<typeof quickCitySchema>

interface QuickCityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (cityId: Id<"cities">) => void
}

export function QuickCityFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickCityFormDialogProps) {
  const t = useTranslations("Cities")
  const tCommon = useTranslations("Common")
  const getCountryName = useCountryTranslation()

  const states = useQuery(api.states.listWithCountry) ?? []
  const countries = useQuery(api.countries.list, {}) ?? []
  const createCity = useMutation(api.cities.create)

  const form = useForm<QuickCityFormData>({
    resolver: zodResolver(quickCitySchema),
    defaultValues: {
      name: "",
      stateId: "",
      countryId: "",
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

  // Auto-fill country from state when state changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "stateId" && value.stateId) {
        const selectedState = states.find((s) => s._id === value.stateId)
        if (selectedState?.countryId) {
          form.setValue("countryId", selectedState.countryId)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [form, states])

  const onSubmit = async (data: QuickCityFormData) => {
    try {
      // Convert empty string to undefined for optional fields
      const submitData = {
        name: data.name,
        stateId: data.stateId === "" ? undefined : data.stateId,
        countryId: data.countryId === "" ? undefined : data.countryId,
        hasFederalPolice: false, // Default to false for quick add
      }

      const cityId = await createCity(submitData)

      toast.success(t("createdSuccess"))
      form.reset()
      onSuccess(cityId)
      onOpenChange(false)
    } catch (error) {
      toast.error(t("errorCreate"))
    }
  }

  const stateOptions = states.map((state) => {
    const countryName = state.country
      ? getCountryName(state.country.code) || state.country.name
      : "Unknown Country"
    return {
      value: state._id,
      label: `${state.name} - ${countryName}`,
    }
  })

  const countryOptions = countries.map((country) => {
    const translatedName = getCountryName(country.code) || country.name
    return {
      value: country._id,
      label: country.flag ? `${country.flag} ${translatedName}` : translatedName,
    }
  })

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("quickAddCityTitle")}</DialogTitle>
          <DialogDescription>
            {t("quickAddCityDescription")}
          </DialogDescription>
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
                    <Input placeholder="São Paulo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("state")}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={stateOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t("selectState")}
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
              name="countryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("country")}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={countryOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t("selectCountry")}
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
