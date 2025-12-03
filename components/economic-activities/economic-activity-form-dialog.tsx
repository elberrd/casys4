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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useTranslations } from "next-intl"
import { economicActivitySchema, EconomicActivityFormData } from "@/lib/validations/economic-activities"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

interface EconomicActivityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  economicActivityId?: Id<"economicActivities">
  onSuccess?: () => void
}

export function EconomicActivityFormDialog({
  open,
  onOpenChange,
  economicActivityId,
  onSuccess,
}: EconomicActivityFormDialogProps) {
  const t = useTranslations('EconomicActivities')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const economicActivity = useQuery(
    api.economicActivities.get,
    economicActivityId ? { id: economicActivityId } : "skip"
  )

  const createEconomicActivity = useMutation(api.economicActivities.create)
  const updateEconomicActivity = useMutation(api.economicActivities.update)

  const form = useForm<EconomicActivityFormData>({
    resolver: zodResolver(economicActivitySchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isActive: true,
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

  // Reset form when economic activity data loads
  useEffect(() => {
    if (economicActivity) {
      form.reset({
        name: economicActivity.name,
        code: economicActivity.code ?? "",
        description: economicActivity.description ?? "",
        isActive: economicActivity.isActive,
      })
    } else if (!economicActivityId) {
      form.reset({
        name: "",
        code: "",
        description: "",
        isActive: true,
      })
    }
  }, [economicActivity, economicActivityId, form])

  const onSubmit = async (data: EconomicActivityFormData) => {
    try {
      // Clean optional fields and convert empty strings to undefined
      const submitData = {
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        isActive: data.isActive ?? true,
      }

      if (economicActivityId) {
        await updateEconomicActivity({ id: economicActivityId, ...submitData })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createEconomicActivity(submitData)
        toast({
          title: t('createdSuccess'),
        })
      }
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: economicActivityId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {economicActivityId ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {economicActivityId
              ? "Edit the economic activity information below"
              : "Fill in the information to create a new economic activity"
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
                    <Input placeholder="e.g., Information Technology Services" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('code')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 6201-5/00" {...field} />
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
                      placeholder="Provide a detailed description of this economic activity..."
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
