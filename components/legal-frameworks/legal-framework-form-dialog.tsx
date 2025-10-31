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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import { useTranslations } from "next-intl"
import { legalFrameworkSchema, LegalFrameworkFormData } from "@/lib/validations/legalFrameworks"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

interface LegalFrameworkFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  legalFrameworkId?: Id<"legalFrameworks">
  onSuccess?: () => void
}

export function LegalFrameworkFormDialog({
  open,
  onOpenChange,
  legalFrameworkId,
  onSuccess,
}: LegalFrameworkFormDialogProps) {
  const t = useTranslations('LegalFrameworks')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const legalFramework = useQuery(
    api.legalFrameworks.get,
    legalFrameworkId ? { id: legalFrameworkId } : "skip"
  )

  const processTypes = useQuery(api.processTypes.listActive, {}) ?? []

  const createLegalFramework = useMutation(api.legalFrameworks.create)
  const updateLegalFramework = useMutation(api.legalFrameworks.update)

  const form = useForm<LegalFrameworkFormData>({
    resolver: zodResolver(legalFrameworkSchema),
    defaultValues: {
      name: "",
      processTypeId: "" as Id<"processTypes">,
      description: "",
      isActive: true,
    },
  })

  // Reset form when legal framework data loads
  useEffect(() => {
    if (legalFramework) {
      form.reset({
        name: legalFramework.name,
        processTypeId: legalFramework.processTypeId,
        description: legalFramework.description,
        isActive: legalFramework.isActive,
      })
    } else if (!legalFrameworkId) {
      form.reset({
        name: "",
        processTypeId: "" as Id<"processTypes">,
        description: "",
        isActive: true,
      })
    }
  }, [legalFramework, legalFrameworkId, form])

  const onSubmit = async (data: LegalFrameworkFormData) => {
    try {
      // Clean optional fields
      const submitData = {
        ...data,
        processTypeId: data.processTypeId || undefined,
        description: data.description || undefined,
      }

      if (legalFrameworkId) {
        await updateLegalFramework({ id: legalFrameworkId, ...submitData })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createLegalFramework(submitData)
        toast({
          title: t('createdSuccess'),
        })
      }
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: legalFrameworkId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {legalFrameworkId ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {legalFrameworkId
              ? "Edit the legal framework information below"
              : "Fill in the information to create a new legal framework"
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
                    <Input placeholder="Law 13.445/2017" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="processTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('processType')}</FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value}
                      onValueChange={field.onChange}
                      options={processTypes.map((pt) => ({
                        label: pt.name,
                        value: pt._id,
                      }))}
                      placeholder={t('selectProcessType')}
                      emptyText={tCommon('noResults')}
                      searchPlaceholder={tCommon('search')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description of the legal framework..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t('isActive')}
                    </FormLabel>
                    <FormDescription>
                      Active legal frameworks are available for selection
                    </FormDescription>
                  </div>
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
