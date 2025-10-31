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
import { useTranslations } from "next-intl"
import { processTypeSchema, ProcessTypeFormData } from "@/lib/validations/processTypes"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

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

  const processType = useQuery(
    api.processTypes.get,
    processTypeId ? { id: processTypeId } : "skip"
  )

  const createProcessType = useMutation(api.processTypes.create)
  const updateProcessType = useMutation(api.processTypes.update)

  const form = useForm<ProcessTypeFormData>({
    resolver: zodResolver(processTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      estimatedDays: 30,
      isActive: true,
    },
  })

  // Reset form when process type data loads
  useEffect(() => {
    if (processType) {
      form.reset({
        name: processType.name,
        description: processType.description,
        estimatedDays: processType.estimatedDays,
        isActive: processType.isActive,
      })
    } else if (!processTypeId) {
      form.reset({
        name: "",
        description: "",
        estimatedDays: 30,
        isActive: true,
      })
    }
  }, [processType, processTypeId, form])

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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  )
}
