"use client"

import { useEffect, useState } from "react"
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
import { MultiSelect } from "@/components/ui/multi-select"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { processTypeSchema, ProcessTypeFormData } from "@/lib/validations/processTypes"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { LegalFrameworkFormDialog } from "@/components/legal-frameworks/legal-framework-form-dialog"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

interface ProcessTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processTypeId?: Id<"processTypes">
  onSuccess?: () => void
}

export function ProcessTypeFormDialog({
  open,
  onOpenChange,
  processTypeId,
  onSuccess,
}: ProcessTypeFormDialogProps) {
  const t = useTranslations('ProcessTypes')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const [showLegalFrameworkDialog, setShowLegalFrameworkDialog] = useState(false)

  const processType = useQuery(
    api.processTypes.get,
    processTypeId ? { id: processTypeId } : "skip"
  )

  const legalFrameworks = useQuery(api.legalFrameworks.listActive) || []

  const currentLegalFrameworks = useQuery(
    api.processTypes.getLegalFrameworks,
    processTypeId ? { processTypeId } : "skip"
  ) || []

  const createProcessType = useMutation(api.processTypes.create)
  const updateProcessType = useMutation(api.processTypes.update)

  const form = useForm({
    resolver: zodResolver(processTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      estimatedDays: 30,
      isActive: true,
      legalFrameworkIds: [] as Id<"legalFrameworks">[],
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

  // Reset form when process type data loads
  useEffect(() => {
    if (processType && currentLegalFrameworks) {
      form.reset({
        name: processType.name,
        description: processType.description,
        estimatedDays: processType.estimatedDays,
        isActive: processType.isActive,
        legalFrameworkIds: currentLegalFrameworks
          .filter((lf): lf is NonNullable<typeof lf> => lf !== null)
          .map((lf) => lf._id),
      })
    } else if (!processTypeId && open) {
      form.reset({
        name: "",
        description: "",
        estimatedDays: 30,
        isActive: true,
        legalFrameworkIds: [],
      })
    }
  }, [processType, currentLegalFrameworks, processTypeId, open, form.reset])

  const onSubmit = async (data: ProcessTypeFormData) => {
    try {
      if (processTypeId) {
        await updateProcessType({ id: processTypeId, ...data })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createProcessType(data)
        toast({
          title: t('createdSuccess'),
        })
      }
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: processTypeId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {processTypeId ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {processTypeId
              ? "Edit the process type information below"
              : "Fill in the information to create a new process type"
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
                    <Input placeholder="Temporary Visa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('estimatedDays')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                        field.onChange(isNaN(value) ? 0 : value)
                      }}
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
                      placeholder="Description of the process type..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="legalFrameworkIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('legalFrameworks')}</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <FormControl>
                          <MultiSelect
                            options={legalFrameworks.map((lf) => ({
                              value: lf._id,
                              label: lf.name,
                            }))}
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                            placeholder={t('selectLegalFrameworks')}
                          />
                        </FormControl>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowLegalFrameworkDialog(true)}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((id) => {
                          const lf = legalFrameworks.find((l) => l._id === id)
                          if (!lf) return null
                          return (
                            <Badge key={id} variant="secondary" className="gap-1">
                              {lf.name}
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange(field.value?.filter((v) => v !== id))
                                }}
                                className="ml-1 hover:bg-secondary-foreground/20 rounded-sm"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                    <FormDescription>
                      {field.value?.length || 0} {t('legalFrameworksCount')}
                    </FormDescription>
                  </div>
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
                      Active process types are available for selection
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

    <LegalFrameworkFormDialog
      open={showLegalFrameworkDialog}
      onOpenChange={setShowLegalFrameworkDialog}
      onSuccess={(newLegalFrameworkId) => {
        // Add the newly created legal framework to the selection
        const currentIds = form.getValues('legalFrameworkIds') || []
        if (newLegalFrameworkId && !currentIds.includes(newLegalFrameworkId)) {
          form.setValue('legalFrameworkIds', [...currentIds, newLegalFrameworkId])
        }
        setShowLegalFrameworkDialog(false)
      }}
    />

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
