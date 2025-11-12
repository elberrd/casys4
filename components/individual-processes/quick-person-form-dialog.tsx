"use client"

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

// Simplified person schema for quick add
const quickPersonSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email").or(z.literal("")),
  nationalityId: z.string().min(1, "Nationality is required"),
  birthDate: z.string().optional().or(z.literal("")),
})

type QuickPersonFormData = z.infer<typeof quickPersonSchema>

interface QuickPersonFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (personId: Id<"people">) => void
}

export function QuickPersonFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickPersonFormDialogProps) {
  const t = useTranslations("People")
  const tCommon = useTranslations("Common")
  const tIndividual = useTranslations("IndividualProcesses")
  const getCountryName = useCountryTranslation()

  const countries = useQuery(api.countries.list, {}) ?? []
  const createPerson = useMutation(api.people.create)

  const form = useForm<QuickPersonFormData>({
    resolver: zodResolver(quickPersonSchema),
    defaultValues: {
      fullName: "",
      email: "",
      nationalityId: "",
      birthDate: "",
    },
  })

  const onSubmit = async (data: QuickPersonFormData) => {
    try {
      const personId = await createPerson({
        fullName: data.fullName,
        email: data.email || undefined,
        nationalityId: data.nationalityId as Id<"countries">,
        birthDate: data.birthDate || undefined,
      })

      toast.success(t("createdSuccess"))
      form.reset()
      onSuccess(personId)
      onOpenChange(false)
    } catch (error) {
      toast.error(t("errorCreate"))
    }
  }

  const countryOptions = countries.map((country) => {
    const translatedName = getCountryName(country.code) || country.name
    return {
      value: country._id,
      label: country.flag ? `${country.flag} ${translatedName}` : translatedName,
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tIndividual("quickAddPerson")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fullName")}</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nationalityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("nationality")}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={countryOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t("selectNationality")}
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
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("birthDate")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
  )
}
