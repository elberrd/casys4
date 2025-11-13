"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { useCountryTranslation } from "@/lib/i18n/countries"
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
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { passportSchema, type PassportFormData } from "@/lib/validations/passports"
import { toast } from "sonner"

interface PassportFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  passportId?: Id<"passports">
  personId?: Id<"people">
  onSuccess?: (passportId?: Id<"passports">) => void
}

function calculateStatus(expiryDate: string): "Valid" | "Expiring Soon" | "Expired" {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

  if (expiry < today) {
    return "Expired"
  } else if (expiry < sixMonthsFromNow) {
    return "Expiring Soon"
  } else {
    return "Valid"
  }
}

function getStatusVariant(status: "Valid" | "Expiring Soon" | "Expired") {
  switch (status) {
    case "Valid":
      return "success"
    case "Expiring Soon":
      return "warning"
    case "Expired":
      return "destructive"
  }
}

export function PassportFormDialog({
  open,
  onOpenChange,
  passportId,
  personId,
  onSuccess,
}: PassportFormDialogProps) {
  const t = useTranslations("Passports")
  const tCommon = useTranslations("Common")
  const getCountryName = useCountryTranslation()

  const passport = useQuery(
    api.passports.get,
    passportId ? { id: passportId } : "skip"
  )
  const people = useQuery(api.people.list, {}) ?? []
  const countries = useQuery(api.countries.list, {}) ?? []

  const createPassport = useMutation(api.passports.create)
  const updatePassport = useMutation(api.passports.update)

  const form = useForm<PassportFormData>({
    resolver: zodResolver(passportSchema),
    defaultValues: {
      personId: personId ?? "",
      passportNumber: "",
      issuingCountryId: "",
      issueDate: "",
      expiryDate: "",
      fileUrl: "",
      isActive: true,
    },
  })

  const expiryDate = form.watch("expiryDate")
  const status = expiryDate ? calculateStatus(expiryDate) : null

  useEffect(() => {
    if (passport) {
      form.reset({
        personId: passport.personId,
        passportNumber: passport.passportNumber,
        issuingCountryId: passport.issuingCountryId,
        issueDate: passport.issueDate,
        expiryDate: passport.expiryDate,
        fileUrl: passport.fileUrl ?? "",
        isActive: passport.isActive,
      })
    } else if (personId) {
      form.setValue("personId", personId)
    }
  }, [passport, personId, form])

  const onSubmit = async (data: PassportFormData) => {
    try {
      if (passportId) {
        await updatePassport({
          id: passportId,
          personId: data.personId as Id<"people">,
          passportNumber: data.passportNumber,
          issuingCountryId: data.issuingCountryId as Id<"countries">,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          fileUrl: data.fileUrl || undefined,
          isActive: data.isActive,
        })
        toast.success(t("updatedSuccess"))
        onSuccess?.(passportId)
      } else {
        const newPassportId = await createPassport({
          personId: data.personId as Id<"people">,
          passportNumber: data.passportNumber,
          issuingCountryId: data.issuingCountryId as Id<"countries">,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          fileUrl: data.fileUrl || undefined,
          isActive: data.isActive,
        })
        console.log('[PassportFormDialog] Created passport with ID:', newPassportId)
        console.log('[PassportFormDialog] Calling onSuccess callback')
        toast.success(t("createdSuccess"))
        onSuccess?.(newPassportId)
        console.log('[PassportFormDialog] onSuccess callback called with:', newPassportId)
      }
    } catch (error) {
      toast.error(passportId ? t("errorUpdate") : t("errorCreate"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {passportId ? t("editTitle") : t("createTitle")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="personId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("person")}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={(value) => field.onChange(value || "")}
                        options={people.map((person) => ({
                          value: person._id,
                          label: person.fullName,
                        }))}
                        placeholder={t("selectPerson")}
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
                name="passportNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("passportNumber")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issuingCountryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("issuingCountry")}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={(value) => field.onChange(value || "")}
                        options={countries.map((country) => {
                          const translatedName = getCountryName(country.code) || country.name
                          return {
                            value: country._id,
                            label: translatedName,
                          }
                        })}
                        placeholder={t("selectCountry")}
                        searchPlaceholder={tCommon("search")}
                        emptyText={tCommon("noResults")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("issueDate")}</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("expiryDate")}</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("status")}:</span>
                  <Badge variant={getStatusVariant(status)}>
                    {t(`status${status.replace(" ", "")}`)}
                  </Badge>
                </div>
              )}

              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fileUrl")}</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("isActive")}</FormLabel>
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
            </div>

            <div className="flex justify-end gap-2">
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
  )
}
