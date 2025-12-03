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
import { useTranslations } from "next-intl"
import { countrySchema, CountryFormData } from "@/lib/validations/countries"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

interface CountryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  countryId?: Id<"countries">
  onSuccess?: () => void
}

export function CountryFormDialog({
  open,
  onOpenChange,
  countryId,
  onSuccess,
}: CountryFormDialogProps) {
  const t = useTranslations('Countries')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const country = useQuery(
    api.countries.get,
    countryId ? { id: countryId } : "skip"
  )

  const createCountry = useMutation(api.countries.create)
  const updateCountry = useMutation(api.countries.update)

  const form = useForm<CountryFormData>({
    resolver: zodResolver(countrySchema),
    defaultValues: {
      name: "",
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

  // Reset form when country data loads
  useEffect(() => {
    if (country) {
      form.reset({
        name: country.name,
      })
    } else if (!countryId) {
      form.reset({
        name: "",
      })
    }
  }, [country, countryId, form])

  const onSubmit = async (data: CountryFormData) => {
    try {
      if (countryId) {
        await updateCountry({ id: countryId, ...data })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createCountry(data)
        toast({
          title: t('createdSuccess'),
        })
      }
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: countryId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {countryId ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {countryId
              ? "Edit the country information below"
              : "Fill in the information to create a new country"
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
                    <Input placeholder="Brazil" {...field} />
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
