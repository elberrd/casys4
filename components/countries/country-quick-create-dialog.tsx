"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "convex/react"
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
import { useTranslations } from "next-intl"
import { countrySchema, CountryFormData } from "@/lib/validations/countries"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

interface CountryQuickCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (countryId: Id<"countries">) => void
  defaultName?: string
}

/**
 * Simplified country creation dialog for inline use in other forms.
 * Contains only essential field: name.
 */
export function CountryQuickCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultName = "",
}: CountryQuickCreateDialogProps) {
  const t = useTranslations('Countries')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const createCountry = useMutation(api.countries.create)

  const form = useForm<CountryFormData>({
    resolver: zodResolver(countrySchema),
    defaultValues: {
      name: "",
    },
  })

  // Update form when defaultName changes
  React.useEffect(() => {
    if (defaultName) {
      form.setValue('name', defaultName)
    }
  }, [defaultName, form])

  const onSubmit = async (data: CountryFormData) => {
    try {
      const countryId = await createCountry({
        name: data.name,
      })

      toast({
        title: t('countryCreated'),
      })

      form.reset()
      onOpenChange(false)
      onSuccess?.(countryId)
    } catch (error) {
      toast({
        title: t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
                    <Input placeholder="United States" {...field} />
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
